function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
function randomIntInc (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

Array.prototype.shuffle = function() {
  var i = this.length, j, temp;
  if ( i == 0 ) return this;
  while ( --i ) {
     j = Math.floor( Math.random() * ( i + 1 ) );
     temp = this[i];
     this[i] = this[j];
     this[j] = temp;
  }
  return this;
}
function stringReplace(textsArray, targetString) {
    if (textsArray && textsArray.length > 0) {
        for(var i = 0; i < textsArray.length; i++) {
            var findIndex = i + 1;
            var findStr = '%' + findIndex;
            var replaceStr = textsArray[i];
            targetString = targetString.split(findStr).join(replaceStr);
        }
    }
    return targetString;
};
module.exports.randomInt = randomInt;
module.exports.randomIntInc = randomIntInc;
module.exports.stringReplace = stringReplace;