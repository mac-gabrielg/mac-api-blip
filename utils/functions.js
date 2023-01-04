import fs from "fs";

export function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

export function getFirstName(fullName) {
  const firstName = fullName.split(" ")[0];
  return toTitleCase(firstName);
}

export function validatePhoneNumber(phone) {
  //remove non-numeric values.
  phone = phone.replace(/\D/g, "");

  //check if it is a Brazilian phone number with starting with 55 and ddd
  if (phone.length === 13 || phone.length === 12) {
    if (phone.startsWith("55")) {
      return phone;
    } else {
      return false;
    }
  }

  //check if it is a Brazilian phone number with ddd
  if (phone.length === 10 || phone.length === 11) {
    return `55${phone}`;
  } else {
    return false;
  }
}

export function quickParsePhone(phone) {
  phone = phone.replace(/\D/g, "");

  if (phone.startsWith("55")) return phone;
  return `55${phone}`;
}

export function loadJSON(path, array = false) {
  try {
    const dataBuffer = fs.readFileSync(path);
    const dataJSON = dataBuffer.toString();
    return JSON.parse(dataJSON);
  } catch (e) {
    if (array) return [];
    return {};
  }
}
