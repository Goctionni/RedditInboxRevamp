const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const shortDateFilter = function(timestamp) {
    let date;
    if(timestamp instanceof Date) date = timestamp;
    else if(typeof timestamp === 'number') date = new Date(timestamp * 1000);

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

export const longDateFilter = function(timestamp) {
    let date;
    if(timestamp instanceof Date) date = timestamp;
    else if(typeof timestamp === 'number') date = new Date(timestamp * 1000);

    const YYYY = date.getFullYear();
    const MMM = MONTHS[date.getMonth()];
    const D = date.getDate();

    let hh = ('' + date.getHours()).padStart(2, '0');
    let mm = ('' + date.getMinutes()).padStart(2, '0');
    let ss = ('' + date.getSeconds()).padStart(2, '0');

    return `${MMM} ${D}, ${YYYY} - ${hh}:${mm}:${ss}`;
};

export const sysDateFilter = function(timestamp) {
    let date;
    if(timestamp instanceof Date) date = timestamp;
    else if(typeof timestamp === 'number') date = new Date(timestamp * 1000);

    const YYYY = date.getFullYear();
    const MM = ('' + (date.getMonth() + 1)).padStart(2, '0');
    const DD = ('' + date.getDate()).padStart(2, '0');

    let hh = ('' + date.getHours()).padStart(2, '0');
    let mm = ('' + date.getMinutes()).padStart(2, '0');
    let ss = ('' + date.getSeconds()).padStart(2, '0');

    return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}`;
};