//import cron from "node-cron";
import nodeSchedule from "node-schedule";
import path from "path";
import { BlipContact } from "../Blip/BlipContact.js";
import { quickParsePhone, getFirstName, loadJSON } from "../utils/functions.js";

import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
if (dotenv.error) {
  console.log(dotenv.parsed);
  throw dotenv.error;
}

const baseURL = process.env.BASEURL;
const ROUTER_KEY = process.env.BOT_KEY;
const TEMPLATE = process.env.AFTER_SALE_TEMPLATE;
const NAMESPACE = process.env.AFTER_SALE_NAMESPACE;
const botId = "macsurveyprod";
const flowId = "22acc93f-2024-4aba-9327-518f027284d7";
const blockId = "476d1d7c-f4b8-4400-8976-7ff57b750598"; // "Início mensagem ativa (resgata pesquisa satisfação)"

const log = console.log;

const macSurvey = (app) => {
  /**
   * Chamada para agendar o envio da pesquisa de NPS
   */
  app.post("/mac/survey", async (req, res) => {
    try {
      log("req.body: ", req.body);
      const { numberPhone, daysToSurvey } = req.body;

      if (!numberPhone || !daysToSurvey)
        return res.status(400).send({
          status: 400,
          error:
            "Missing one of the following required parameters: 'numberPhone', 'daysToSurvey'",
        });

      const date = new Date();
      let hour = date.getHours();
      let minute = date.getMinutes();
      let day = date.getDate();
      let year = date.getFullYear();
      let month = date.getMonth();
      minute = minute + 1;

      const numDays = new Date(year, month + 1, 0);
      day += daysToSurvey;
      if (day > numDays) {
        day = day - numDays;
        month += 1;
      }
      if (month > 11) {
        month = 0;
        year += 1;
      }

      const dt = new Date(year, month, day, 13, 0, 0); //mudar isso antes de ir para produção pois está setado a chamada no dia 3
      log("day: %d, hour: %d, minute: %d", day, hour, minute);

      let job = nodeSchedule.scheduleJob(dt, async () => {
        log("NPS message sending");

        try {
          const channel = "whatsapp";

          //log(`Sending After Sale Messages to ${contacts.length} contacts..`);

          const user = new BlipContact(
            ROUTER_KEY,
            quickParsePhone(numberPhone)
          );
          console.log("bot_key: ", ROUTER_KEY);

          user.sendMessageTemplateWithRedirection(
            botId,
            flowId,
            blockId,
            TEMPLATE,
            NAMESPACE,
            [],
            channel
          );

          console.log("user: ", user);
        } catch (error) {
          console.log(error);
          return error?.message;
        }
      });

      return res.status(200).send({
        status: 200,
        response: "success",
      });
    } catch (e) {
      return res.status(400).send({
        status: 400,
        error: e.message,
      });
    }
  });

  /**
   * Retorna lista de empreendimentos do sugar
   */
  app.get("/mac/enterprises", async (req, res) => {
    try {
      log("req.headers: ", req.headers);
      const { oauth } = req.headers;
      if (!oauth)
        return res.status(400).send({
          status: 400,
          error: "Missing one of the following required parameters: 'oauth'",
        });

      log("oauth: ", oauth);
      log("baseURL: ", baseURL);
      //log("url: ", baseURL + `rest/v10/IT_2_Development/filter`);
      let response = await axios({
        method: "post",
        url: baseURL + `rest/v10/IT_2_Development/filter`,
        headers: {
          Cookie: "download_token_base=b471bde9-5456-458d-aa97-0f8cd0ad000c",
          "Oauth-Token": oauth,
          "Content-Type": "application/json",
        },
        data: {
          filter: [
            {
              liberar_empreendimento_c: true,
            },
          ],
        },
      }).catch((err) => {
        return res
          .status(500)
          .send({ error: "Internal Server Error: " + err, status: 500 });
      });
      //console.log("response 1: ", response);
      if (response.data) {
        response = response.data;
        log("response 2: ", response);
        let records = new Array();
        response.records.forEach((record) => {
          records.push({
            name: record.name,
            empreendimento_whatsapp_c: record.empreendimento_whatsapp_c,
            descricao_empreendimento_c: record.descricao_empreendimento_c,
          });
        });
        res.status(200).send({ records });
      }
    } catch (e) {
      return res.status(400).send({
        status: 400,
        error: e.message,
      });
    }
  });

  /**
   * Retorna lista de atendentes dispiníveis do sugar
   */
  app.get("/mac/availableAttendant", async (req, res) => {
    try {
      log("req.headers: ", req.headers);
      const { oauth } = req.headers;
      if (!oauth)
        return res.status(400).send({
          status: 400,
          error: "Missing one of the following required parameters: 'oauth'",
        });

      let response = await axios({
        method: "get",
        url: baseURL + `rest/v10/it6_service_queue`,
        headers: {
          "Oauth-Token": oauth,
          "Content-Type": "application/json",
        },
        data: {
          filter: [
            {
              queue_type_c: "whatsapp",
              status_queue_c: "Disponivel",
            },
          ],
        },
      }).catch((err) => {
        return res
          .status(500)
          .send({ error: "Internal Server Error: " + err, status: 500 });
      });
      if (response.data) {
        response = response.data;
        //log("response: ", response);
        let availableAttendant = new Array();
        response.records.forEach((record) =>
          availableAttendant.push(record.name)
        );
        res.status(200).send({ availableAttendant });
      }
    } catch (e) {
      return res.status(400).send({
        status: 400,
        error: e.message,
      });
    }
  });

  /**
   * Retorna dados do atendente no sugar
   */
  app.get("/mac/attendantInfo", async (req, res) => {
    try {
      log("req.headers: ", req.headers);
      const { oauth, attendant } = req.headers;
      if ((!oauth, !attendant))
        return res.status(400).send({
          status: 400,
          error:
            "Missing one of the following required parameters: 'oauth', 'attendant'",
        });

      let response = await axios({
        method: "get",
        url: baseURL + `rest/v10/Users/`,
        headers: {
          "Oauth-Token": oauth,
          "Content-Type": "application/json",
        },
        data: {
          filter: [
            {
              "email_addresses.email_address": attendant,
            },
          ],
        },
      }).catch((err) => {
        return res
          .status(500)
          .send({ error: "Internal Server Error: " + err, status: 500 });
      });
      if (response.data) {
        response = response.data;
        if (response.records.length > 0) {
          //log("response: ", response);
          res.status(200).send({
            length: response.records.length,
            name: response.records[0].commercial_name_c,
            phone: response.records[0].phone_work,
            email: response.records[0].email[0].email_address,
          });
        } else {
          res.status(200).send({ length: 0 });
        }
      }
    } catch (e) {
      return res.status(400).send({
        status: 400,
        error: e.message,
      });
    }
  });

  app.get("/mac/historyMessage", async (req, res) => {
    try {
      log("req.headers: ", req.query);
      const contactIdentity = req.query.contactIdentity;
      const dateFirstConversation = req.query.dateFirstConversation;
      const keyBot = req.query.keyBot;

      if ((!contactIdentity, !dateFirstConversation, !keyBot))
        return res.status(400).send({
          status: 400,
          error:
            "Missing one of the following required parameters: 'contactIdentity', 'dateFirstConversation', 'keyBot'",
        });

      await axios({
        method: "post",
        url: "https://http.msging.net/commands",
        headers: {
          Authorization: keyBot,
          "Content-Type": "application/json",
        },
        data: {
          id: `blip_sap_historico_${new Date().getTime()}`,
          method: "get",
          uri: `/threads/${contactIdentity}?$take=100&storageDate=${dateFirstConversation}&direction=asc&refreshExpiredMedia=true`,
        },
      })
        .then((response) => {
          let messages = response.data["resource"]["items"];
          //log("messages: ", messages);
          let formattedMessages = { conversation: "" };

          for (let message of messages) {
            if (message["type"] == "text/plain") {
              formattedMessages.conversation += `{
"id" : "${message["id"]}",
"direction" : "${message["direction"]}",
"content" : "${message["content"]}",
"date" : "${message["date"]}",
"status" : "${message["status"]}",
},
`;
            }
          }

          return res.send(formattedMessages);
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).send({
            status: 500,
            message: err,
          });
        });
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        items: {
          erro: err,
        },
      });
    }
  });
};

export { macSurvey };
