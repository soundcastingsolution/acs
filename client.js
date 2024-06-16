import { CallClient, CallAgent } from "@azure/communication-calling";
import {
  AzureCommunicationTokenCredential,
  CommunicationUserIdentifier,
} from "@azure/communication-common";
import { CommunicationIdentityClient } from "@azure/communication-identity";

let calls = []; // Store ongoing calls in an array
let callAgent;
let stringIndex = 0; // Index to keep track of the next string to use

const calleePhoneInput = document.getElementById("callee-phone-input");
const callPhoneButton = document.getElementById("call-phone-button");
const callsContainer = document.getElementById("calls-container");

async function init() {
  const connectionString = await fetchConnectionStringFromFile();
  const identityClient = new CommunicationIdentityClient(connectionString);
  const user = await identityClient.createUser();
  const tokenResponse = await identityClient.getToken(user, ["voip"]);
  const tokenCredential = new AzureCommunicationTokenCredential(
    tokenResponse.token
  );

  const callClient = new CallClient();
  callAgent = await callClient.createCallAgent(tokenCredential);
}

async function fetchConnectionStringFromFile() {
  try {
    const response = await fetch("connection_string.txt");
    const connectionString = await response.text();
    return connectionString.trim(); // Remove any leading/trailing whitespace
  } catch (error) {
    console.error("Error fetching connection string:", error);
    throw error; // Rethrow the error for handling in caller function
  }
}

init();

async function storePhoneNumber(phoneNumber) {
  try {
    const response = await fetch("https://soundcasting.net/azure/api.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(phoneNumber)
    });
    if (!response.ok) {
      throw new Error("Failed to store phone number.");
    }
    const responseData = await response.json();
    // Handle the response data if needed
    console.log("Store phone number response:", responseData);
  } catch (error) {
    console.error("Error storing phone number:", error);
    // Handle the error if needed
  }
}


callPhoneButton.addEventListener("click", () => {
  const phoneNumbers = calleePhoneInput.value
    .split("\n")
    .map((num) => num.trim());

  phoneNumbers.forEach(async (phoneToCall) => {
    if (phoneToCall === "") return;
    const strings = await fetch("numbers.txt").then(response => response.text()).then(text => text.trim().split("\n").map(line => line.trim()));
    const stringToUse = strings[stringIndex];
    stringIndex = (stringIndex + 1) % strings.length;
    const call = callAgent.startCall([{ phoneNumber: phoneToCall }], {
      alternateCallerId: { phoneNumber: stringToUse },
    });
    calls.push(call);
    const callInfoDiv = document.createElement("div");
    await storePhoneNumber(phoneToCall);
    callInfoDiv.textContent = `Call to ${phoneToCall}: `;
    callsContainer.appendChild(callInfoDiv);

    // Create a hang up button for the new call
    const hangUpPhoneButton = document.createElement("button");
    hangUpPhoneButton.textContent = "Hang Up";
    hangUpPhoneButton.addEventListener("click", () => {
      endCall(calls.indexOf(call));
      callsContainer.removeChild(callInfoDiv);
    });

    callInfoDiv.appendChild(hangUpPhoneButton);
  });
});

function endCall(index) {
  if (index >= 0 && index < calls.length) {
    calls[index].hangUp({ forEveryone: true });
    calls.splice(index, 1);
  }
}
