function parseHrtimeToSeconds(hrtime) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    var minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;
    return minutes + 'min ' + seconds +'sec';
}
function parsePageTime(hrtime) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    var minutes = Math.floor(seconds / 60);
    seconds = seconds - minutes * 60;
    return seconds;
}
function hrTimeToSeconds(hrtime) {
    var seconds = (hrtime[0] + (hrtime[1] / 1e9)).toFixed(3);
    return seconds;
}

function sanitaziFileName(fileName) {
    return fileName.replace(/[&\/\\#,+$~%'":*?<>{}]/g,'_');
}

function replaceFileExt(fileName, newExt) {
    var fileParts = fileName.split('.');
    if(fileParts.length > 1) fileParts.pop();
    return fileParts.join('.') + '.' + newExt;
}

function haveExt(fileName) {
    var fileParts = fileName.split('.');
    return fileParts.length > 1;
}
function getExt(fileName) {
    var fileParts = fileName.split('.');
    return fileParts.pop();
}
function inject(target, source) {
    for (var key in source) {
        var value = source[key];
        target[key] = value;
      }

}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}
function formatFilesCount(count) {
    return count.toLocaleString('en');
}
function formatFilesSize(bytes) {
    if (typeof bytes !== 'number') {
        return '';
    }
    if (bytes >= 1000000000) {
        return formatFilesCount((bytes / 1000000000)) + ' GB';
    }
    if (bytes >= 1000000) {
        return formatFilesCount((bytes / 1000000)) + ' MB';
    }
    if (bytes >= 1000) {
        return formatFilesCount((bytes / 1000)) + ' KB';
    }
    return formatFilesCount(bytes) + ' B';
}
module.exports.randomInt = randomInt;
module.exports.randomIntInc = randomIntInc;
module.exports.parseHrtimeToSeconds = parseHrtimeToSeconds;
module.exports.hrTimeToSeconds = hrTimeToSeconds;
module.exports.sanitaziFileName = sanitaziFileName;
module.exports.replaceFileExt = replaceFileExt;
module.exports.haveExt = haveExt;
module.exports.getExt = getExt;
module.exports.inject = inject;
module.exports.randomInt = randomInt;
module.exports.randomIntInc = randomIntInc;
module.exports.parsePageTime = parsePageTime;
module.exports.formatFilesCount = formatFilesCount;
module.exports.formatFilesSize = formatFilesSize;