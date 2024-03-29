import { program } from "commander";

import { IControl } from "./control.type";
import { getAugmentedDate, getDateAtStdTime } from "./date";

interface ICommandResult extends IControl {
  isInteractive: boolean;
}


export const getCommands = (): ICommandResult => {
  program
  .name("better-youtube-habbiti-cli")
  .description(`CLI to download youtube video. By default run daily job.`)
  .version("1.0.0");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  program.option('-c --channelFilepath', 'Channels file', './channels.json');
  program.option('-i --interactive', 'Start interactive interface.');
  program.option('-o --outputDir', 'Directory to outputs.', './outputs');
  program.option(
    '-f --fromDate <fromDate>',
    'Downloading from this date(yyyy-mm-dd).',
    (dateStr: string) => getDateAtStdTime(getAugmentedDate(dateStr)),
    yesterday
  );
  program.option(
    '-t --toDate <toDate>',
    'Downloading until this date(yyyy-mm-dd).',
    (dateStr: string) => getDateAtStdTime(getAugmentedDate(dateStr)),
    today
  );
  program.parse();

  const options = program.opts();

  const channelFilepath = options.channelFilepath;
  const isInteractive = options.interactive;
  const outputDir = options.outputDir;
  const fromDate = getDateAtStdTime(options.fromDate);
  const toDate = getDateAtStdTime(options.toDate);

  return { channelFilepath, isInteractive, outputDir,fromDate, toDate };
}
