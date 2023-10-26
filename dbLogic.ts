import { prisma } from "./client";
import { SERVER_ERROR } from "./constants";
import { ApprovalStatus, UserPerOrder, WorkflowUserData } from "./sharedTypes";
import { FORBIDDEN, INTERNAL_SERVER_ERROR, OK } from "./statusCodes";
import { ServerOperationResult } from "./types";
import { parseApprovalStatus, parseRole } from "./validations";

export async function getDataForAccessCode(accessCode: string): Promise<
  ServerOperationResult & {
    data?: { userData: WorkflowUserData; wcOrderId: number };
  }
> {
  //Check if valid access code
  const accessCodeInDb = await prisma.accessCode.findUnique({
    where: {
      code: accessCode,
    },
    include: {
      user: true,
      order: true,
    },
  });

  if (!accessCodeInDb) {
    return {
      message: "Invalid access code.",
      statusCode: FORBIDDEN,
    };
  }

  const { user: activeUser, order: activeOrder } = accessCodeInDb;

  const userRolesThisOrder = await prisma.userRole.findMany({
    where: {
      orderId: activeOrder.id,
    },
    include: {
      user: {
        include: {
          approvalStatuses: true,
        },
      },
    },
  });

  //Look through the users, roles, etc. for this order. Build user data objects that will be easy for the front end to use.
  //While looping, also pull out the role and approval status for the user associated with the access code.
  //If any bad strings are found for role or approval, it's caught here.
  try {
    let activeUserData: UserPerOrder | undefined = undefined;
    const relevantDataPerUser = userRolesThisOrder.map((roleEntry) => {
      const role = parseRole(roleEntry.role);
      const statusEntryThisOrder = roleEntry.user.approvalStatuses.find(
        (status) => status.orderId === activeOrder.id
      );
      const hasStatusThisOrder = statusEntryThisOrder !== undefined;
      const approvalStatus: ApprovalStatus = hasStatusThisOrder
        ? parseApprovalStatus(statusEntryThisOrder.approvalStatus)
        : "undecided";
      const userData: UserPerOrder = {
        name: roleEntry.user.name,
        approvalStatus,
        role,
      };
      if (roleEntry.user.id === activeUser.id) activeUserData = userData;

      return userData;
    });
    if (activeUserData === undefined) {
      console.error(
        `User ${activeUser.id} had an access code for order ${activeOrder.id} but no role in the order!`
      );
      return {
        message: SERVER_ERROR,
        statusCode: INTERNAL_SERVER_ERROR,
      };
    }

    return {
      message: "",
      statusCode: OK,
      data: {
        userData: { users: relevantDataPerUser, activeUser: activeUserData },
        wcOrderId: activeOrder.wcOrderId,
      },
    };
  } catch (error) {
    return {
      message: SERVER_ERROR,
      statusCode: INTERNAL_SERVER_ERROR,
    };
  }
}
