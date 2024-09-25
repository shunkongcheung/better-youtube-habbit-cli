import express from "express";
import { program } from "commander";
import os from "os";
import fs from "fs";
import path from "path";
import qrcodeTerminal from "qrcode-terminal";

const getLocalIP = () => {
  const networkInterfaces = os.networkInterfaces();
  const ipv4Regex =
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/gm;
  const ipv4Index = networkInterfaces["Wi-Fi"].findIndex((item) =>
    ipv4Regex.test(item.address),
  );
  return networkInterfaces["Wi-Fi"][ipv4Index].address;
};

const getQrCode = async (value: string) =>
  new Promise<string>((resolve) => {
    qrcodeTerminal.generate(value, { small: true }, resolve);
  });

const getCommands = () => {
  program
    .name("better-youtube-habbiti-cli:server")
    .description("Serving file in local network")
    .version("1.0.0");

  program.option("-p --port <port>", "Port number", "3000");

  program.parse();
  const options = program.opts();
  const port = options.port;

  return { port };
};

(async () => {
  const { port } = getCommands();
  const outputDir = path.join(__dirname, "../outputs");
  const fileNames = fs.readdirSync(outputDir);

  const app = express();

  app.get("/f/:fileName", (req, res) => {
    const paramFileName = req.params.fileName as string;
    const id = req.query.id as string;
    const fileName = fileNames[id];

    res.set(
      "Content-Disposition",
      `attachment; filename="${encodeURI(paramFileName)}"`,
    );
    res.sendFile(path.join(outputDir, fileName));
  });

  app.get("/", (_req, res) => {
    const fileHrefs = fileNames.map((fileName, id) => {
      const encodedName = encodeURI(fileName).replace(/#/g, "");
      const url = encodedName + `?id=${id}`;
      return `<a href="/f/${url}">${fileName}</a>`;
    });
    const listItems = fileHrefs.map((fileHref) => `<li>${fileHref}</li>`);
    const content = `<ul>${listItems.join("")}</ul>`;
    res.send(content);
  });

  app.listen(port);

  const localIP = getLocalIP();
  const url = `http://${localIP}:${port}`;
  const qrcode = await getQrCode(url);
  const output =
    "Hello, welcome to better youtube habit service.\n" +
    `Your current IP is ${url}. Or scan:\n\n` +
    qrcode;

  console.log(output);
})();
