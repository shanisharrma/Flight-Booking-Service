function compareTime(timeString1, timeString2) {
  let dateTime1 = new Date(timeString1);
  let dataTime2 = new Date(timeString2);
  return dateTime1.getTime() > dataTime2.getTime();
}

module.exports = {
  compareTime,
};
