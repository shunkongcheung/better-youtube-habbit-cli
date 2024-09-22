import express from "express";
import os from "os";
import fs from "fs";
import path from "path";
import qrcodeTerminal from "qrcode-terminal";

const app = express();

const outputDir = path.join(__dirname, "../outputs");
const fileNames = fs.readdirSync(outputDir);

const networkInterfaces = os.networkInterfaces();
const localIP = networkInterfaces["Wi-Fi"][3].address; // Replace with your interface name

app.get("/f/:fileName", (req, res) => {
  const id = req.query.id as string;
  const fileName = fileNames[id];
  res.sendFile(path.join(outputDir, fileName));
});

app.get("/", (_req, res) => {
  const fileHrefs = fileNames.map((fileName, id) => {
    const url = encodeURI(fileName).replace(/#/g, "") + `?id=${id}`;
    return `<a href="/f/${url}">${fileName}</a>`;
  });
  const listItems = fileHrefs.map((fileHref) => `<li>${fileHref}</li>`);
  const content = `<ul>${listItems.join("")}</ul>`;
  res.send(content);
});

const getQrCode = async (value: string) =>
  new Promise<string>((resolve) => {
    qrcodeTerminal.generate(value, { small: true }, resolve);
  });

(async () => {
  app.listen(3000);

  const url = `http://${localIP}:3000`;
  const qrcode = await getQrCode(url);
  const output =
    "Hello, welcome to better youtube habit service.\n" +
    `Your current IP is ${url}. Or scan:\n\n` +
    qrcode;

  console.log(output);
})();
