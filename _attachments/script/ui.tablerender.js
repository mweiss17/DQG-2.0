/*global self: false */
self.addEventListener('message', function (e) {
    "use strict";
    var data = e.data;
    switch (data.cmd) {
    case 'ConvertObject':
        self.RowNum = 0;
        self.GroupLevel = parseInt(data.group_level, 10);
        self.SelectedElements = data.SelectedElements;
        self.ConvertObjectToTable(data.obj);
        break;
    case 'ConvertResults':
        //self.postMessage(CreateTableBody(data.results);
        break;
    default:
        self.postMessage('Unknown cmd');
        break;
    }
}, false);

self.ConvertObjectToTable = function (obj) {
    "use strict";
    var tbl = [],
        tblrow = [],
        objrow,
        columnsIdx = ['Identifier'],
        group_level = self.GroupLevel,
        Selected = self.SelectedElements,
        prefix,
        sPrefix,
        FieldName,
        i = parseInt(group_level, 10),
        j,
        idx,
        val,
        existingRows = {},
        Prefixes = [],
        numEls = Object.keys(obj).length,
        numProcessed = 0,
        numRows = Object.keys(existingRows),
        el,
        identifier,
        row;
    self.RowNum = 0;
    for (el in obj) {
        if (obj.hasOwnProperty(el)) {
            identifier = el.split(',');
            i = parseInt(group_level, 10);
            prefix = [];
            while (i > 0) {
                i -= 1;
                prefix.push(identifier.pop());
            }
            sPrefix = prefix.join("_").toUpperCase();
            // Create a new row. We'll initialize it to empty after we know how many columns there are,
            // which depends on how many prefixes are found in this loop.
            row = [];
            row[0] = identifier.join(",");
            existingRows[identifier.join(",")] = row;
            if (Prefixes.indexOf(sPrefix) === -1) {
                Prefixes.push(sPrefix);
            }
        }
    }
    Prefixes.sort();

    for (i = 0; i < Selected.length; i += 1) {
        for (j = 0; j < Prefixes.length; j += 1) {
            prefix = Prefixes[j];
            if (prefix) {
                columnsIdx[1 + i + (Selected.length * j)] = Prefixes[j] + "_" +  Selected[i];
            } else {
                columnsIdx[1 + i + (Selected.length * j)] = Selected[i];
            }
        }
    }
    // Instruct the main thread to create the table headers
    self.postMessage({ cmd: 'PopulateHeaders', Headers: columnsIdx});
    for (row in existingRows) {
        if (existingRows.hasOwnProperty(row)) {
            // 0 is identifier, so skip it..
            for (i = 1; i < columnsIdx.length; i += 1) {
                existingRows[row][i] = '.';
            }
        }
    }

    // Now go through the data, and convert it to rows. Join the different
    // documents together into a single array if there's multiple instruments
    // and add the prefix to put everything in its right column
    numProcessed = 0;
    //self.debug(existingRows);
    //self.debug(obj);
    for (el in obj) {
        if (obj.hasOwnProperty(el)) {
            numProcessed += 1;

            identifier = el.split(',');
            i = parseInt(group_level, 10);
            prefix = [];
            while (i > 0) {
                i -= 1;
                prefix.push(identifier.pop());
            }
            sPrefix = prefix.join("_").toUpperCase();

            this.debug({ id: "I am", el: el });
            tblrow = existingRows[identifier.join(",")];
            objrow = obj[el];
            for (j = 0; j < Selected.length; j += 1) {
                if (objrow.hasOwnProperty(Selected[j])) {
                    if (sPrefix) {
                        FieldName = sPrefix + "_" + Selected[j];
                    } else {
                        FieldName = Selected[j];
                    }
                    idx = columnsIdx.indexOf(FieldName);
                    val = objrow[Selected[j]];
                    if (val === undefined || val === null) {
                        tblrow[idx] = '.';
                    } else {
                        tblrow[idx] = objrow[Selected[j]];
                    }
                }
            }
            self.RowNum = numProcessed;
            self.postMessage({ cmd: 'Status', RowNum: numProcessed, Total: numEls });
        }
    }


    // Data has been processed, send message to begin adding it to the table. Include RowNum and
    // TotalRows so that we can update a status.
    numRows = Object.keys(existingRows).length;
    i = 1;
    for (el in existingRows) {
        if (existingRows.hasOwnProperty(el)) {
            self.postMessage({ cmd: 'AddRow', Row: existingRows[el], RowNum: i, TotalRows: numRows });
            i += 1;
        }
    }
    self.close();
};

self.debug = function (message) {
    "use strict";
    self.postMessage({ cmd: 'Debug', message: message });
};
