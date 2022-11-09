if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  CsvEditor
//******************************************************************************
/**
 *   Panel used to view/edit tabular file data (csv, tab, xls, xlsx, etc)
 *
 ******************************************************************************/

bluewave.editor.CsvEditor = function(parent, config) {

    var me = this;
    var defaultConfig = {
        panel: {

        },
        data: {
            hasHeader: false,
            sheetName: null
        }
    };

    var combobox, toggleSwitch; //toolbar items
    var gridContainer, grid; //grid elements
    var data = []; //output from parseCSV or parseXLS


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var table = createTable(parent);
        createToolbar(table.addRow().addColumn());
        gridContainer = table.addRow().addColumn();
        gridContainer.style.height = "100%";
        gridContainer.className = "grid-container-"+new Date().getTime();
        createFooter(table.addRow().addColumn());
        me.el = table;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        data = [];
        grid = null;
        gridContainer.innerHTML = "";
        combobox.clear();
        combobox.hide();
        toggleSwitch.setValue(false);
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(node){
        me.clear();

      //Update config
        config.data = merge(node.config, defaultConfig.data);


      //Update toolbar items
        var silent = true;
        if (config.data.hasHeader){
            toggleSwitch.setValue(true, silent);
        }
        if (!isArray(data[0])){
            for (var i=0; i<data.length; i++){
                var sheetName = data[i].name;
                combobox.add(sheetName, sheetName);
            }
        }
        if (config.data.sheetName){
            combobox.setValue(config.data.sheetName, silent);
        }



        if (!node.data && node.file){

            var file = node.file;
            var fileName = file.name.toLowerCase();
            var idx = fileName.lastIndexOf(".");
            if (idx>-1){
                var ext = fileName.substring(idx+1);
                if (ext==='csv' || ext==='tab' || ext==='tsv'){
                    var reader = new FileReader();
                    reader.onload = (function(f) {
                        return function(e) {
                            var text = e.target.result;
                            data = parseCSV(text, {
                                separator: ext==='csv' ? "," : "\t"
                            });
                            node.data = data;
                            updateGrid();
                        };
                    })(file);
                    reader.readAsText(file);
                }
                else if (ext==='xls' || ext==='xlsx'){
                    var reader = new FileReader();
                    reader.onload = (function(f) {
                        return function(e) {
                            var arrayBuffer = e.target.result;
                            data = parseXLS(arrayBuffer);
                            node.data = data;
                            data.forEach((sheet)=>{
                                combobox.add(sheet.name, sheet.name);
                            });
                            combobox.show();

                        };
                    })(file);
                    reader.readAsArrayBuffer(file);
                }
                else{
                    //TODO: Add more options
                }
            }
        }
        else{
            data = node.data;
            updateGrid();
        }

    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Return data configuration
   */
    this.getConfig = function(){
        return config.data;
    };


  //**************************************************************************
  //** createToolbar
  //**************************************************************************
    var createToolbar = function(parent){

        var div = document.createElement("div");
        div.className = "panel-toolbar";
        parent.appendChild(div);


        var row = createTable(div).addRow();
        var td;


      //Create buttons and pulldowns
        td = row.addColumn();
        td.style.width = "100%";
        combobox = new javaxt.dhtml.ComboBox(td, {
            style: config.style.combobox,
            readOnly: true
        });
        combobox.onChange = function(val){
            config.data = {
                hasHeader: false,
                sheetName: val
            };
            updateGrid();
        };




      //Create toggle switch
        td = row.addColumn();
        var div = document.createElement("div");
        div.style.width = "135px";
        td.appendChild(div);

        var textString = document.createElement("div");
        textString.innerText = "Has Header";
        textString.className = "toolbar-button-label";
        textString.style.float = "left";
        textString.style.padding = "0 5px 0 8px";
        textString.style.lineHeight = "24px";
        div.appendChild(textString);

        var toggleContainer = document.createElement("div");
        toggleContainer.style.float = "left";
        div.appendChild(toggleContainer);

        toggleSwitch = new javaxt.dhtml.Switch(toggleContainer);
        toggleSwitch.setValue(false);

        toggleSwitch.onChange = function(){
            config.data.hasHeader = toggleSwitch.getValue();
            updateGrid();
        };

    };


  //**************************************************************************
  //** createFooter
  //**************************************************************************
    var createFooter = function(parent){

        var div = document.createElement("div");
        div.style.float = "right";
        div.style.width = "175px";
        div.style.padding = "0px 16px 8px 0px";
        parent.appendChild(div);

        var slider = document.createElement("input");
        div.appendChild(slider);
        slider.type = "range";
        slider.className = "dashboard-slider";

        var min = 8;
        var max = 14;

        slider.setAttribute("min", min+1);
        slider.setAttribute("max", max+1);
        slider.onchange = function(){
            var val = (this.value-1);
            updateGridSize(val);
        };
    };


  //**************************************************************************
  //** updateGrid
  //**************************************************************************
    var updateGrid = function(){
        grid = null;
        gridContainer.innerHTML = "";


        if (!data) return;
        if (data.length===0) return;


        var hasHeader = config.data.hasHeader;
        if (!isArray(data[0])){
            var sheetName = config.data.sheetName;
            if (sheetName){
                for (var i=0; i<data.length; i++){
                    if (data[i].name===sheetName){
                        var sheet = data[i];
                        grid = createGrid(sheet.getData(), hasHeader, gridContainer, config);
                        break;
                    }
                }
            }
        }
        else{
            grid = createGrid(data, hasHeader, gridContainer, config);
        }
    };


  //**************************************************************************
  //** updateGridSize
  //**************************************************************************
    var updateGridSize = function(size){

      //Set class name
        var gridClass = "." + gridContainer.className;


      //Find style node with the class name
        var targetStyle;
        var styles = document.getElementsByTagName("style");
        for (var i=0; i<styles.length; i++){
            var sheet = styles[i].sheet;
            var rules = sheet.cssRules;
            for (var j=0; j<rules.length; j++) {
                var rule = rules[j];
                if (rule.selectorText){

                  //Delete style rule if found. We'll create a new one instead
                    if (rule.selectorText.indexOf(gridClass===0)){
                        sheet.deleteRule(j);
                        targetStyle = styles[i];
                        break;
                    }

                }
            }
        }


      //Create new style node as needed
        if (!targetStyle){
            targetStyle = document.createElement("style");
            targetStyle.appendChild(document.createTextNode(""));
            document.head.appendChild(targetStyle);
        }


      //Add css rule
        targetStyle.sheet.insertRule(
            gridClass + " .table-header-col, " +
            gridClass + " .table-col {" +
                "height: " + (size*2.5) + "px;" +
                "line-height: " + (size*2.5) + "px;" +
                "font-size: " + size + "px;" +
            "}", 0);

    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var isArray = javaxt.dhtml.utils.isArray;
    var createTable = javaxt.dhtml.utils.createTable;
    var createGrid = bluewave.utils.createGrid;
    var parseCSV = bluewave.utils.parseCSV;
    var parseXLS = bluewave.utils.parseXLS;

    init();
};