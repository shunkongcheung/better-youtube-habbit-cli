export const getAugmentedDate = (dateStr: string) => {
  // setHours would set date to previous date if original Date was in 00:00AM.
  // this function is used in commander option parsing only
  return `${dateStr} 11:00 AM`;
};

export const getDateAtStdTime = (dateOriginal: Date | string) => {
  // expecting dateOriginal be in format of "yyyy-mm-dd"
  const result =
    typeof dateOriginal == "string"
      ? new Date(
          Number(dateOriginal.split("-")[0]),
          Number(dateOriginal.split("-")[1]) - 1,
          Number(dateOriginal.split("-")[2]),
        )
      : new Date(dateOriginal);
  result.setHours(7, 0, 0, 0);
  return result;
};
