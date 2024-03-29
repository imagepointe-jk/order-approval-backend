import {
  EmailData,
  fullyApprovedSubject,
  generateEmailsAfterApprovalStatusChange,
  generateFullyApprovedMessage,
  generateGenericStatusChangeMessage,
  generateGenericStatusChangeConfirmation,
  genericSubject,
  canceledSubject,
  generateRealCancelMessage,
  generateTentativeCancelMessage,
  generateCancelConfirmation,
} from "../../mail/notifications";
import { ApprovalStatus, Role } from "../../sharedTypes";
import { UserWithDbData } from "../../types";

const createFakeUserData = (): UserWithDbData[] => [
  {
    id: 1,
    name: "John",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "john@example.com",
    role: "artist",
  },
  {
    id: 1,
    name: "Jane",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "jane@example.com",
    role: "editor",
  },
  {
    id: 1,
    name: "Mike",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "mike@example.com",
    role: "requester",
  },
  {
    id: 1,
    name: "Mary",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "mary@example.com",
    role: "approver",
  },
  {
    id: 1,
    name: "Steve",
    accessCode: "abc",
    approvalStatus: "undecided",
    email: "steve@example.com",
    role: "releaser",
  },
];

describe("Check for correct notifications when the order is fully approved", () => {
  it("should generate a 'fully approved' email for everyone when the order is fully approved", () => {
    const fakeUsers = createFakeUserData();
    const fakeOrderId = 1234;
    for (const user of fakeUsers) {
      user.approvalStatus = "approve";
    }

    const generatedEmails = generateEmailsAfterApprovalStatusChange(
      "requester",
      "approve",
      fakeOrderId,
      fakeUsers
    );
    expect(generatedEmails.length).toBe(fakeUsers.length);

    const expectedEmails: EmailData[] = fakeUsers.map((user) => ({
      recipientAddress: user.email,
      subject: fullyApprovedSubject(fakeOrderId),
      message: generateFullyApprovedMessage(user.name, fakeOrderId),
    }));

    for (const email of expectedEmails) {
      expect(generatedEmails).toContainEqual(email);
    }
  });
});

describe("Check for correct email notifications when anyone changes status to 'approve'", () => {
  it("should generate an email for everyone but the artist when the editor changes to 'approve'", () => {
    testGenericStatusChangeNotifications(1, "approve", false);
  });
  it("should generate an email for everyone but the artist when the requester changes to 'approve'", () => {
    testGenericStatusChangeNotifications(2, "approve", false);
  });
  it("should generate an email for everyone but the artist when the approver changes to 'approve'", () => {
    testGenericStatusChangeNotifications(3, "approve", false);
  });
  it("should generate an email for everyone but the artist when the releaser changes to 'approve'", () => {
    testGenericStatusChangeNotifications(4, "approve", false);
  });
});
describe("Check for correct email notifications when anyone changes status to 'undecided'", () => {
  it("should generate an email for everyone but the artist when the requester changes to 'undecided'", () => {
    testGenericStatusChangeNotifications(2, "undecided", false);
  });
  it("should generate an email for everyone but the artist when the approver changes to 'undecided'", () => {
    testGenericStatusChangeNotifications(3, "undecided", false);
  });
  it("should generate an email for everyone but the artist when the releaser changes to 'undecided'", () => {
    testGenericStatusChangeNotifications(4, "undecided", false);
  });
});

describe("Check for correct email notifications when anyone changes status to 'revise'", () => {
  it("should generate an email for EVERYONE, including the artist, when the editor changes to 'revise'", () => {
    testGenericStatusChangeNotifications(1, "revise", true);
  });
  it("should generate an email for EVERYONE, including the artist, when the requester changes to 'revise'", () => {
    testGenericStatusChangeNotifications(2, "revise", true);
  });
  it("should generate an email for EVERYONE, including the artist, when the approver changes to 'revise'", () => {
    testGenericStatusChangeNotifications(3, "revise", true);
  });
  it("should generate an email for EVERYONE, including the artist, when the releaser changes to 'revise'", () => {
    testGenericStatusChangeNotifications(4, "revise", true);
  });
});

describe("Check for correct email notifications when anyone changes status to 'cancel'", () => {
  it("should generate a REAL CANCEL email for everyone except the artist when the editor changes to 'cancel'", () => {
    testCancelNotifications(1);
  });
  it("should generate a REAL CANCEL email for everyone except the artist when the requester changes to 'cancel'", () => {
    testCancelNotifications(2);
  });
  it("should generate a TENTATIVE CANCEL email for everyone except the artist when the approver changes to 'cancel'", () => {
    testCancelNotifications(3);
  });
  it("should generate a REAL CANCEL email for everyone except the artist when the releaser changes to 'cancel'", () => {
    testCancelNotifications(4);
  });
});

function testGenericStatusChangeNotifications(
  userIndexForChange: number,
  newStatus: ApprovalStatus,
  includeArtistEmail: boolean
) {
  const fakeUsers = createFakeUserData();
  const fakeOrderId = 1234;
  const [artist, editor, requester, approver, releaser] = fakeUsers;
  const userThatChanged = fakeUsers[userIndexForChange];
  const usersWithoutArtist = [editor, requester, approver, releaser];

  const generatedEmails = generateEmailsAfterApprovalStatusChange(
    userThatChanged.role as Role,
    newStatus,
    fakeOrderId,
    fakeUsers
  );
  const expectedCount = includeArtistEmail
    ? fakeUsers.length
    : fakeUsers.length - 1;
  expect(generatedEmails.length).toBe(expectedCount);

  const usersListToUse = includeArtistEmail ? fakeUsers : usersWithoutArtist;

  const expectedEmails: EmailData[] = usersListToUse.map((user) => ({
    recipientAddress: user.email,
    subject: genericSubject(fakeOrderId),
    message:
      user.name === userThatChanged.name
        ? generateGenericStatusChangeConfirmation(
            user.name,
            newStatus,
            fakeOrderId,
            user.accessCode
          )
        : generateGenericStatusChangeMessage(
            user.name,
            userThatChanged.name,
            newStatus,
            fakeOrderId,
            user.accessCode
          ),
  }));

  for (const expectedEmail of expectedEmails) {
    expect(generatedEmails).toContainEqual(expectedEmail);
  }
}

function testCancelNotifications(userIndexForChange: number) {
  const fakeUsers = createFakeUserData();
  const fakeOrderId = 1234;
  const [artist, editor, requester, approver, releaser] = fakeUsers;
  const userThatChanged = fakeUsers[userIndexForChange];
  const usersWithoutArtist = [editor, requester, approver, releaser];

  const generatedEmails = generateEmailsAfterApprovalStatusChange(
    userThatChanged.role as Role,
    "cancel",
    fakeOrderId,
    fakeUsers
  );

  expect(generatedEmails.length).toBe(fakeUsers.length - 1);

  let expectedEmails: EmailData[];

  if (userThatChanged.role === "approver") {
    //if the approver changed to cancel, send a tentative cancel message to each user
    expectedEmails = usersWithoutArtist.map((user) => {
      const recipientAddress = user.email;
      const subject = genericSubject(fakeOrderId);
      const isConfirmation = user.name === approver.name;
      const message = generateTentativeCancelMessage(
        user.name,
        approver.name,
        fakeOrderId,
        user.accessCode,
        isConfirmation
      );
      return { recipientAddress, subject, message };
    });
  } else {
    //if someone else changed to cancel, it was really canceled, so send a real cancel message to each user
    expectedEmails = usersWithoutArtist.map((user) => {
      const recipientAddress = user.email;
      const subject = canceledSubject(fakeOrderId);
      const message =
        user.name === userThatChanged.name
          ? generateCancelConfirmation(user.name, fakeOrderId)
          : generateRealCancelMessage(
              user.name,
              userThatChanged.name,
              fakeOrderId
            );
      return { recipientAddress, subject, message };
    });
  }

  for (const expectedEmail of expectedEmails) {
    expect(generatedEmails).toContainEqual(expectedEmail);
  }
}
