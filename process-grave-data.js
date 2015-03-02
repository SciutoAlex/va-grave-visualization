var async = require('async');
var d3 = require('d3');
var csv = require('csv');
var stringify = require('csv-stringify');
var csvParse = require('csv-parse');
var fs = require('fs');
var transform = require('stream-transform');
var _ = require('lodash');
var i = 0;
var counter = 0;


var csvSourcePath = "./data/source.csv";
var finalPath = "./data/processed-fiveyears.tsv";
var modulo = 5;
var binString = "%Y";

var find = false;
init();



function init() {

  var input = fs.createReadStream(csvSourcePath);
  var parser = csv.parse({"columns" : true});
  var output = [];

  var firstObj;

  var dateFormatObj = d3.time.format(binString);

  var output = {};
  var testArray = [];

  var wars = {};

  var transformer = transform(function(r, callback){
    // if(testArray.indexOf(r.war) == -1) {
    //   testArray.push(r.war);
    //   console.log(testArray);
    // }

    if(r.d_birth_date && r.d_death_date && r.relationship === "Veteran (Self)") {
      var warsArray = createWarArray(r.war);

      var keyStringArray = createKeyString(r.d_birth_date, r.d_death_date, warsArray);




      if(keyStringArray && !find) {

        if((keyStringArray[0]) === 1940 && contains(warsArray, ["WORLD WAR II"])) {
          console.log(r);
          console.log("\""+r.d_birth_date+"\",\"" +r.d_death_date +"\"");
        }

        //Last minute fixes based on viewing the data

        //Some Civil war soldiers are listed as 19xx. Should be 18xx.
        if((keyStringArray[0]) > 1860 && contains(warsArray, ["CIVIL WAR"])) {
          keyStringArray[0] -= 100;
          keyStringArray[1] -= 100;
        }

        var keyString = keyStringArray.join('-');
        if(!output[keyString]) {
          output[keyString] = {
            birth : keyStringArray[0],
            death : keyStringArray[1],
            total : 0
          }
          if(!firstObj) {
            firstObj = output[keyString];
          }
        }

        output[keyString].total++;

        warsArray.forEach(function(war) {


          if(!firstObj[war]) {
            firstObj[war] = 0;
          }
          if(!output[keyString][war]) {
            output[keyString][war] = 0;
          }

          if(_.find(wars, {"war" : war}) && (_.find(wars, {"war" : war}).end < keyStringArray[0])) {
            console.log(r);
          } else {
            output[keyString][war]++;
          }
        });





      }
    }
    writeWaiting();
    callback(null);
  });

  fs.readFile("./app/scripts/us-wars.txt", function(err, warstring) {
     csvParse(warstring, {"delimiter" : "\t","columns" : true}, function(err, warArray) {
       wars = warArray;
      var stream = input.pipe(parser).pipe(transformer);

      stream.on('finish', function() {
        saveData(output, function() {
          console.log("saved!");
        })
      });
    })

  })

}

function saveData(obj, cb) {
  var arrayFromObject = _.values(obj);
  stringify(arrayFromObject, {delimiter : '\t', header : true}, function(err, string) {
    fs.writeFile(finalPath, string, function(err) {
      if(err) {
        cb(err, "finished with errors");
      } else {
        cb(err, "finished with no errors");
      }
    })
  })

}



// createKeyString("04/09/1931","04/27/2013");
// createKeyString("08/23/1930","04/28/2013");
// createKeyString("01/15/1949","04/28/2013")

function createKeyString(birth, death) {

  var birthDeathObjs = returnbirthDeathObjs(birth, death);

  var dateFormatObj = d3.time.format(binString);
  var birthFormatted = roundNumberDown(dateFormatObj(birthDeathObjs[0]));
  var deathFormatted = roundNumberDown(dateFormatObj(birthDeathObjs[1]));
  // console.log([birthFormatted, deathFormatted]);

  if(((deathFormatted - birthFormatted) < 18) || ((deathFormatted - birthFormatted) > 110)) {
    return null;
  }

  return [birthFormatted, deathFormatted];
}
//
// roundNumberDown(1983);
// roundNumberDown(1845);
// roundNumberDown(1932);
// roundNumberDown(1798);
function roundNumberDown(number) {
  var returnval = number - number%modulo;
  // console.log(returnval);
  return returnval;
}






// returnbirthDeathObjs("11/11/1890","11/11/69");
// returnbirthDeathObjs("03/15/1887","5/24/57");
// returnbirthDeathObjs("01/01/1893","7/23/71");
// returnbirthDeathObjs("06/07/1845","1/12/16");
// returnbirthDeathObjs("12/20/1841","6/12/1865");
// returnbirthDeathObjs("12/20/65","6/12/06");
// returnbirthDeathObjs("12/20/06","6/12/05");

function returnbirthDeathObjs(birthString, deathString) {
  var normalizedBirth = normalizeDateString(birthString);
  var normalizedDeath = normalizeDateString(deathString);


  var parse4 = d3.time.format("%m/%d/%Y");
  var parse2 = d3.time.format("%m/%d/%y");
  // check if there are no years
  if(normalizedBirth[2].length === 2 && normalizedDeath[2].length === 2 ) {

    var birthObj = parse2.parse(normalizedBirth.join('/'));
    var deathObj = parse2.parse(normalizedDeath.join('/'));
    // if(deathObj.getTime() - birthObj.getTime() < 0) {
    //   birthObj.setFullYear(birthObj.getFullYear() - 100);
    // }
  }

  if(normalizedBirth[2].length === 4 && normalizedDeath[2].length === 2 ) {
    var birthObj = parse4.parse(normalizedBirth.join('/'));
    normalizedDeath[2] = normalizedBirth[2].slice(0,2) + normalizedDeath[2];
    var deathObj = parse4.parse(normalizedDeath.join('/'));
    if(deathObj.getTime() - birthObj.getTime() < 0) {
      deathObj.setFullYear(deathObj.getFullYear() + 100);
    }
  }

  if(normalizedBirth[2].length === 4 && normalizedDeath[2].length === 4 ) {
    var birthObj = parse4.parse(normalizedBirth.join('/'));
    var deathObj = parse4.parse(normalizedDeath.join('/'));
  }

  // console.log( [birthObj, deathObj]);
  var d = new Date();
  if(birthObj.getTime() > d.getTime()) {
    birthObj.setFullYear(birthObj.getFullYear() - 100);
  }

  if(deathObj.getTime() > d.getTime()) {
    deathObj.setFullYear(deathObj.getFullYear() - 100);
  }
  return [birthObj, deathObj];
}


// normalizeDateString("3/17/27");
// normalizeDateString("06/24/1895");
// normalizeDateString("7/19/36");
// normalizeDateString("1/4/07");
// normalizeDateString("1893");
// normalizeDateString("1943");
function normalizeDateString(string) {
  var parts = string.split('/');
  for(var i in parts) {
    if(parts[i].length === 1) {
      parts[i] = "0" + parts[i];
    }
  }

  if(parts.length === 1) {
    var year = parts[0];
    parts = ['01', '01', year];
  }
  // console.log(parts);
  return parts;
}

// console.log(contains(["ONE", "TWO", "THREE"],["FOUR"]))
function contains(arrHay, arrSeed) {
  var val = false;
  arrSeed.map(function(seed) {
    if(arrHay.indexOf(seed) !== -1) {
      val = true;
      return;
    }
  })
  return val;
}

// console.log(createWarArray("WORLD WAR II"));
// console.log(createWarArray("WORLD WAR II, KOREA, VIETNAM"));
// console.log(createWarArray("WORLD WAR II, KOREA"));
// console.log(createWarArray(""));
function createWarArray(warString) {
  if(!warString) {
    return ["noWarSpecified"];
  }
  var wars = warString.split(",");
  var cleanWars = wars.map(function(war) {
    var cleaned = war.trim();
    if(cleaned) {
      return cleaned;
    }
  });
  return cleanWars;
}

function writeWaiting() {
  counter++;
  process.stdout.clearLine();  // clear current text
   process.stdout.cursorTo(0);  // move cursor to beginning of line
   i = (i + 1) % 4;
   var dots = new Array(i + 1).join(".");
   process.stdout.write("Waiting (" +counter+")" + dots);  // write text
}
