const fs = require('fs')

module.exports = {
    propNamesToLowerCase: (rows) => {
      const returnRows = rows.map(function(r){
				r = Object.keys(r).reduce((c, k) => (c[k.toLowerCase()] = r[k], c), {});
				return r;
      })
      return(returnRows)
    },
    objectDifference: (obj1, obj2, notInclude=null) => {
  
      // Make sure an object to compare is provided
      if (!obj2 || Object.prototype.toString.call(obj2) !== '[object Object]') {
        return obj1;
      }
  
      //
      // Variables
      //
  
      var diffs = {};
      var key;
  
  
      //
      // Methods
      //
  
      /**
       * Check if two arrays are equal
       * @param  {Array}   arr1 The first array
       * @param  {Array}   arr2 The second array
       * @return {Boolean}      If true, both arrays are equal
       */
      var arraysMatch = function (arr1, arr2) {
  
        // Check if the arrays are the same length
        if (arr1.length !== arr2.length) return false;
  
        // Check if all items exist and are in the same order
        for (var i = 0; i < arr1.length; i++) {
          if (arr1[i] !== arr2[i]) return false;
        }
  
        // Otherwise, return true
        return true;
  
      };
  
      /**
       * Compare two items and push non-matches to object
       * @param  {*}      item1 The first item
       * @param  {*}      item2 The second item
       * @param  {String} key   The key in our object
       */
      var compare = function (item1, item2, key) {
  
        // Get the object type
        var type1 = Object.prototype.toString.call(item1);
        var type2 = Object.prototype.toString.call(item2);
  
        // If type2 is undefined it has been removed
        if (type2 === '[object Undefined]') {
          diffs[key] = null;
          return;
        }
  
        // If items are different types
        if (type1 !== type2) {
          diffs[key] = item2;
          return;
        }
  
        // If an object, compare recursively
        if (type1 === '[object Object]') {
          var objDiff = diff(item1, item2);
          if (Object.keys(objDiff).length > 0) {
            diffs[key] = objDiff;
          }
          return;
        }
  
        // If an array, compare
        if (type1 === '[object Array]') {
          if (!arraysMatch(item1, item2)) {
            diffs[key] = item2;
          }
          return;
        }
  
        // Else if it's a function, convert to a string and compare
        // Otherwise, just compare
        if (type1 === '[object Function]') {
          if (item1.toString() !== item2.toString()) {
            diffs[key] = item2;
          }
        } else {
          if (item1 !== item2 ) {
            diffs[key] = item2;
          }
        }
  
      };
  
  
      //
      // Compare our objects
      //
  
      // Loop through the first object
      for (key in obj1) {
        if (obj1.hasOwnProperty(key)) {
          if(key != notInclude){
            compare(obj1[key], obj2[key], key);
          }
        }
      }
  
      // Loop through the second object and find missing items
      for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
          if (!obj1[key] && obj1[key] !== obj2[key] && (key != notInclude)) {
            diffs[key] = obj2[key];
          }
        }
      }
  
      // Return the object of differences
      return diffs;
  
    },
    includes_: (x, y) => typeof x == "string" && x.indexOf(y) > -1,
    containsAll: (needles, haystack) => { 
      return needles.every(i => haystack.includes(i))
    },
    ReadJSON: async (file) => {
      const read_data = await fs.promises.readFile(file, "utf8")
      return new Promise((resolve) => { 
          const parsed_read_data = JSON.parse(read_data);
          resolve (parsed_read_data)
      })
      
   }
  };