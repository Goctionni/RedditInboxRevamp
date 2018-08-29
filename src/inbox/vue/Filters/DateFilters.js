const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDateFilter = function(timestamp) {
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const day = date.getDate();
    const month = date.getMonth();

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth();

    // If this message is from last year: dd MMM, YYYY
    if(year !== currentYear){
        return day + ' ' + MONTHS[month] + ', ' + year;
    }
    // If this message if from this year, but not today: dd MMM
    if(day !== currentDay || month !== currentMonth){
        return day + ' ' + MONTHS[month];
    }

    // If this message is from today
    let hour = date.getHours() % 12;
    if (hour === 0) hour = 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const am_pm = ((date.getHours() >= 12) ? 'pm' : 'am');

    return `${hour}:${minutes} ${am_pm}`;
};