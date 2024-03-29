import clear from "clear";
import * as inquirer from '@inquirer/prompts';
import { IControl } from "./control.type";
import { getAugmentedDate, getDateAtStdTime } from "./date";

export const runInteractive = async (): Promise<IControl> => {
  clear(); // clear terminal

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const channelFilepath = await inquirer.input({
    message: "Channels file",
    default: "./channels.json",
  });

  const outputDir = await inquirer.input({
    message: "Directoy to outputs.",
    default: "./outputs",
  });

  const fromDateStr = await inquirer.input({
    message: "Downloading from this date(yyyy-mm-dd).",
  });

  const toDateStr = await inquirer.input({
    message: "Downloading until this date(yyyy-mm-dd).",
  });

  const fromDate = getDateAtStdTime(fromDateStr ? getAugmentedDate(fromDateStr) : yesterday);
  const toDate = getDateAtStdTime(toDateStr ? getAugmentedDate(toDateStr) : today);

  return { channelFilepath, outputDir, fromDate, toDate };
}
