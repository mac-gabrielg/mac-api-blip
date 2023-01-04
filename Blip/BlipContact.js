import axios from "axios";

//import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import { validatePhoneNumber } from "../utils/functions.js";

export class BlipContact {
  //   private _botKey: string;
  //   private _whatsAppNumber: string;
  //   private _contactIdentity: string;
  //   private _header: { Authorization: string; "Content-Type": string };

  constructor(botKey, whatsAppNumber) {
    this._botKey = botKey;
    this._header = {
      Authorization: botKey,
      "Content-Type": "application/json",
    };

    const number = validatePhoneNumber(whatsAppNumber);
    console.log("number: ", number);

    if (!number) {
      throw new Error(
        `It was not possible to get the contact identity for the whatsAppNumber: ${whatsAppNumber}. Make sure it has a valid Brazilian format. Examples: 55XXXXXXXXXXX, +55(XX)XXXX-XXXX, +55(XX)XXXXX-XXXX.`
      );
    } else {
      this._whatsAppNumber = `+${number}`;
    }
  }

  get botKey() {
    return this._botKey;
  }

  get whatsAppNumber() {
    return this._whatsAppNumber;
  }

  async getIdentity(channel = "whatsapp") {
    let addr = "wa.gw.msging.net";
    if (channel === "sms") {
      addr = "infobip.gw.msging.net";
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: `postmaster@${addr}`,
        method: "get",
        uri: `lime://wa.gw.msging.net/accounts/${this._whatsAppNumber}`,
      },
    });

    if (!res.data?.resource?.identity) {
      throw new Error(
        `It was not possible to get the contact identity for the WhatsApp number: ${this._whatsAppNumber}. Make sure it has the folowing format: +55(XX)XXXX-XXXX or +55(XX)XXXXX-XXXX. Status Request: ${res.status}. Response Request: ${res.data}.`
      );
    }

    this._contactIdentity = res.data.resource.identity;

    return {
      status: res.status,
      contactIdentity: this._contactIdentity,
      requestResponse: res.data,
    };
  }

  async getAllContextVariables() {
    if (!this._contactIdentity) {
      await this.getIdentity();
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: "postmaster@msging.net",
        method: "get",
        uri: `/contexts/${this._contactIdentity}`,
      },
    });

    return {
      status: res.status,
      variables: res.data?.resource?.items,
      data: res.data,
    };
  }

  async getContextVariableValue(variableName) {
    if (!this._contactIdentity) {
      await this.getIdentity();
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: "postmaster@msging.net",
        method: "get",
        uri: `/contexts/${this._contactIdentity}/${variableName}`,
      },
    });

    return {
      status: res.status,
      variableValue: res.data.resource,
      data: res.data,
    };
  }

  async deleteContextVariable(variableName) {
    if (!this._contactIdentity) {
      await this.getIdentity();
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: "postmaster@msging.net",
        method: "delete",
        uri: `/contexts/${this._contactIdentity}/${variableName}`,
      },
    });

    // Check if variable was successfully deleted
    const variables = (await this.getAllContextVariables())?.variables;

    if (variables?.includes(variableName)) {
      throw new Error(
        `It was not possible to change the contact context variable master-state value.`
      );
    }

    return {
      status: res.status,
      data: res.data,
    };
  }

  async deleteAllContextVariables() {
    const resGetAllContextVariables = await this.getAllContextVariables();

    const contactContextVariables =
      resGetAllContextVariables.data?.resource?.items;

    if (!contactContextVariables) {
      return {
        statusReponse: resGetAllContextVariables.status,
        requestResponse: resGetAllContextVariables.data,
      };
    }

    contactContextVariables.forEach(async (variable) => {
      await this.deleteContextVariable(variable);
    });

    return {
      message: `All context variables for the contact identity ${this._contactIdentity} were successfully deleted.`,
      deletedContextVariables: contactContextVariables,
    };
  }

  async deleteAllContactStates() {
    const resGetAllContextVariables = await this.getAllContextVariables();

    const contactContextVariables =
      resGetAllContextVariables.data?.resource?.items;

    if (!contactContextVariables) {
      return {
        statusReponse: resGetAllContextVariables.status,
        requestResponse: resGetAllContextVariables.data,
      };
    }

    const deletedContactStates = [];

    await Promise.all(
      contactContextVariables.map(async (variable) => {
        if (variable.includes("stateid@")) {
          await this.deleteContextVariable(variable);
          deletedContactStates.push(variable);
        }
      })
    );

    // for (let i = 0; i < contactContextVariables.length; i++) {
    //     if (contactContextVariables[i].includes("stateid@")) {
    //         await this.deleteContextVariable(contactContextVariables[i])
    //         deletedContactStates.push(contactContextVariables[i])
    //     }
    // }

    return {
      message: `All states for the contact identity ${this._contactIdentity} were successfully deleted.`,
      deletedContactStates,
    };
  }

  async changeContactMasterState(botId) {
    if (!this._contactIdentity) {
      await this.getIdentity();
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: "postmaster@msging.net",
        method: "set",
        uri: `/contexts/${this._contactIdentity}/master-state`,
        type: "text/plain",
        resource: `${botId}@msging.net`,
      },
    });

    //check if master-state was successfully changed
    const masterStateValue = (
      await this.getContextVariableValue("master-state")
    ).variableValue;

    if (masterStateValue !== `${botId}@msging.net`) {
      throw new Error(
        `It was not possible to change the contact context variable master-state value.`
      );
    }

    return {
      status: res.status,
      data: res.data,
    };
  }

  async changeContactState(flowId, blockId) {
    if (!this._contactIdentity) {
      await this.getIdentity();
    }

    const res = await axios({
      method: "post",
      url: "https://msging.net/commands",
      headers: this._header,
      data: {
        id: uuidv4(),
        to: "postmaster@msging.net",
        method: "set",
        uri: `/contexts/${this._contactIdentity}/stateid%40${flowId}`,
        type: "text/plain",
        resource: blockId,
      },
    });

    //check if the contact state was successfully changed
    const stateValue = (await this.getContextVariableValue(`stateid@${flowId}`))
      .variableValue;

    if (stateValue !== blockId) {
      throw new Error(
        `It was not possible to change the contact context variable stateid@${flowId} value.`
      );
    }

    return {
      status: res.status,
      data: res.data,
    };
  }

  async redirectContact(botId, flowId, blockId) {
    //change master-state
    const resChangeContactMasterState = await this.changeContactMasterState(
      botId
    );

    //change contact state
    const resChangeContactState = await this.changeContactState(
      flowId,
      blockId
    );

    return {
      resChangeContactMasterState,
      resChangeContactState,
    };
  }

  async sendMessageTemplate(
    messageTemplateName,
    messageNameSpace,
    messageParameters,
    channel = "whatsapp",
    email = "",
    subject = "Óculos Mania"
  ) {
    try {
      await this.getIdentity(channel);
    } catch (error) {
      console.log(error);
    }

    const BOT_KEY = process.env.BOT_KEY ?? "";
    let res;

    if (channel === "email") {
      email = email.replace("@", "%40");

      res = await axios({
        method: "post",
        url: "https://msging.net/messages",
        headers: {
          "Content-Type": "application/json",
          Authorization: BOT_KEY,
        },
        data: {
          id: "{{$guid}}",
          to: `${email}@mailgun.gw.msging.net`,
          type: "text/plain",
          content: {
            type: "template",
            template: {
              name: messageTemplateName,
              namespace: messageNameSpace,
              language: {
                code: "pt_BR",
                policy: "deterministic",
              },
              components: [
                {
                  type: "body",
                  parameters: messageParameters,
                },
              ],
            },
          },
          metadata: {
            "mail.subject": subject,
          },
        },
      });
    } else {
      res = await axios({
        method: "post",
        url: "https://http.msging.net/messages",
        headers: this._header,
        data: {
          id: uuidv4(),
          to: this._contactIdentity,
          type: "application/json",
          content: {
            type: "template",
            template: {
              name: messageTemplateName,
              namespace: messageNameSpace,
              language: {
                code: "pt_BR",
                policy: "deterministic",
              },
              components: [
                {
                  type: "body",
                  parameters: messageParameters,
                },
              ],
            },
          },
        },
      });
    }

    return {
      status: res.status,
      data: res.data,
    };
  }

  async sendMessageTemplateWithRedirection(
    botId,
    flowId,
    blockId,
    messageTemplateName,
    messageNameSpace,
    messageParameters,
    channel = "whatsapp",
    email = "",
    subject = "Óculos Mania"
  ) {
    try {
      const resDeleteAllContactStates = await this.deleteAllContactStates();

      const resRedirectContact = await this.redirectContact(
        botId,
        flowId,
        blockId
      );

      const resSendMessageTemplate = await this.sendMessageTemplate(
        messageTemplateName,
        messageNameSpace,
        messageParameters,
        channel,
        email,
        subject
      );

      return {
        resDeleteAllContactStates,
        resRedirectContact,
        resSendMessageTemplate,
      };
    } catch (error) {
      console.log(error);
      return {};
    }
  }
}
