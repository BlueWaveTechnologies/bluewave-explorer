if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  PieEditor
//******************************************************************************
/**
 *   Panel used to edit pie chart
 *
 ******************************************************************************/

bluewave.editor.PieEditor = function(parent, config) {
    var me = this;
    var defaultConfig = {
        panel: {

        },
        colors: bluewave.utils.getColorGradients(),
        chart: {
            pieCutout: 0.65,
            piePadding: 0,
            pieSort: "value",
            pieSortDir: "descending",
            maximumSlices: 0,
            labelOffset: 120,
            showOther: true,
            showTooltip: true
        }
    };

    var editor;
    var inputData = [];
    var numSlices = 0;
    var pieInputs = {};
    var chartConfig = {};
    var styleEditor;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);
        chartConfig = config.chart;


        editor = createEditor(parent, {
            onSettings: function(){
                if (chartConfig) editStyle();
            },
            onResize: function(){
                createPreview();
            },
            onTitleChange: function(title){
                chartConfig.chartTitle = title;
            }
        });
        me.el = editor.el;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(node){
        me.clear();

      //Clone the config so we don't modify the original config object
        var clone = {};
        merge(clone, node.config);


      //Merge clone with default config
        merge(clone, config.chart);
        chartConfig = clone;


      //Get input data
        for (var key in node.inputs) {
            if (node.inputs.hasOwnProperty(key)){
                var inputNode = node.inputs[key];
                var data = parseData(inputNode.data, inputNode.config);
                if (data.length>0) inputData.push(data);
                else{

                  //Special case for supply chain data
                    var inputConfig = inputNode.config;
                    if (inputConfig) inputData.push(inputConfig);
                }
            }
        }


      //Special case for sankey data
        var data = inputData[0];
        var linksAndQuantity = [];
        if (data.hasOwnProperty("links")) {
            data = Object.values(data.links);

            var nodeAndType = [];
            for (var node in inputData[0].nodes) {
                var nodeType = inputData[0].nodes[node].type;
                var nodeName = inputData[0].nodes[node].name;

                var nodeAndTypeEntry = {};
                nodeAndTypeEntry.id = node;
                nodeAndTypeEntry.type = nodeType;
                nodeAndTypeEntry.name = nodeName;
                nodeAndType.push(nodeAndTypeEntry);
            }

            for (var link in inputData[0].links) {
                var linkStartType = "";
                var linkEndType = "";
                var linkEndName = "";
                var linkQuantity = inputData[0].links[link].quantity;

                for (var entry of nodeAndType) {
                    if (link.startsWith(entry.id)) {
                        linkStartType = entry.type;
                    }
                    if (link.endsWith(entry.id)) {
                        linkEndType = entry.type;
                        linkEndName = entry.name;
                    }
                }

                var linkFullType = linkStartType + " to " + linkEndName;
                var linksAndQuantityEntry = {};
                linksAndQuantityEntry.key = linkFullType;
                linksAndQuantityEntry.value = linkQuantity;
                linksAndQuantityEntry.sendType = linkStartType;
                linksAndQuantityEntry.receiveType = linkEndType;

                var previousEntryIndex = linksAndQuantity.findIndex(entry => entry.key === linkFullType);

                if (previousEntryIndex !== -1) {
                    linksAndQuantity[previousEntryIndex].value = linksAndQuantity[previousEntryIndex].value + linkQuantity;
                }
                else {
                    linksAndQuantity.push(linksAndQuantityEntry);
                }
            }


            data = linksAndQuantity.slice();
            data = data.filter(entry => entry.key.includes(chartConfig.pieKey));

            if(chartConfig.pieDirection === "Inbound") {
                data = data.filter(entry => entry.receiveType.endsWith(chartConfig.pieKey));
            }
            else {
                data = data.filter(entry => entry.sendType.startsWith(chartConfig.pieKey));
            }


            let scData = [];
            data.forEach(function(entry, index) {
                let scEntry = {};
                if (entry.key.includes(chartConfig.pieKey)) {
                    scEntry[chartConfig.pieKey] = entry.key;
                    scEntry[chartConfig.pieValue] = entry.value;
                }
                scData.push(scEntry);
            });
            inputData = [scData];
        }


      //Set colors
        var colors = null;
        if (chartConfig.colors){
            if (isString(chartConfig.colors)) colors = JSON.parse(chartConfig.colors);
            else if (isArray(chartConfig.colors)) colors = chartConfig.colors;
        }
        if (!colors && config.colors) colors = Object.values(config.colors)[0];
        if (colors) chartConfig.colors = colors;


      //Set title
        if (chartConfig.chartTitle){
            editor.setTitle(chartConfig.chartTitle);
        }

        createOptions(editor.getLeftPanel());
        createPreview();
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        numSlices = 0;
        chartConfig = {};
        editor.clear();
    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Return chart configuration file
   */
    this.getConfig = function(){
        return chartConfig;
    };


  //**************************************************************************
  //** getChart
  //**************************************************************************
    this.getChart = function(){
        return editor.getChartArea();
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
  /** Used to render a pie chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.PieChart(parent, {});
        createPreview(chart);
        return chart;
    };


  //**************************************************************************
  //** createOptions
  //**************************************************************************
    var createOptions = function(parent) {
        var data = inputData[0];


        var hasLinks = data.hasOwnProperty("links");


        var fields;
        if (hasLinks) {
            data = Object.values(data.links);
            var nodeTypeList = [];
            for (var node in data.nodes) {
                var nodeType = data.nodes[node].type;
                if (nodeTypeList.indexOf(nodeType) === -1) {
                    nodeTypeList.push(nodeType);
                }
            }
            fields = nodeTypeList;
        }
        else{
            fields = Object.keys(data[0]);
        }


      //Analyze dataset
        var keyFields = [];
        var valueFields = [];
        fields.forEach((field)=>{
            var values = [];
            data.forEach((d)=>{
                var val = d[field];
                values.push(val);
            });
            var type = getType(values);

            if (type=="string" || type==null){
                keyFields.push({
                    name: field, values: new Set(values).size
                });
            }
            if (type=="number" || type=="currency") valueFields.push(field);
        });



        var table = createTable(parent);
        table.style.height = "";


        if (hasLinks){
            createDropdown(table,"pieKey","Group By","key");
            createDropdown(table,"pieDirection","Direction","direction");
            fields.forEach((val)=>{
                pieInputs.key.add(val, val);
            });
            chartConfig.pieValue = "quantity";
            pieInputs.direction.add("Inbound");
            pieInputs.direction.add("Outbound");
            pieInputs.direction.setValue(chartConfig.pieDirection, true);
        }
        else{

            createDropdown(table,"pieKey","Key","key");


          //Populate key pulldown
            keyFields.sort(function(a, b){
                return a.values-b.values;
            });
            keyFields.forEach((field)=>{
                pieInputs.key.add(field.name,field.name);
            });


            createDropdown(table,"pieValue","Value","value");
            valueFields.forEach((field)=>{
                pieInputs.value.add(field,field);
            });


            createDropdown(table,"pieSort","Sort By","sort");
            pieInputs.sort.add("");
            pieInputs.sort.add("Key");
            pieInputs.sort.add("Value");

            createDropdown(table,"pieSortDir","Sort Direction","sortDir");
        }



      //Select default key value
        if (!chartConfig.pieKey && keyFields.length>0){
            chartConfig.pieKey = keyFields[0].name;
        }
        pieInputs.key.setValue(chartConfig.pieKey, true);


      //Select default value field
        if (!chartConfig.pieValue && valueFields.length>0){
            chartConfig.pieValue = valueFields[0];
        }
        pieInputs.value.setValue(chartConfig.pieValue, true);

    };


  //**************************************************************************
  //** createDropdown
  //**************************************************************************
    var createDropdown = function(table,chartConfigRef,displayName,inputType){
        var td;


        td = table.addRow().addColumn();
        td.innerHTML= displayName+":";

        td = table.addRow().addColumn();
        pieInputs[inputType] = new javaxt.dhtml.ComboBox(td, {
            style: config.style.combobox,
            readOnly: true
        });
        pieInputs[inputType].clear();
        pieInputs[inputType].onChange = function(name, value){
            if (chartConfigRef==="pieSort"){
                if (value.length>0){
                    chartConfig[chartConfigRef] = value;

                    var dir = pieInputs.sortDir.getValue();
                    if (!dir) dir = "Ascending";

                    pieInputs.sortDir.clear();
                    pieInputs.sortDir.add("Ascending");
                    pieInputs.sortDir.add("Descending");

                    pieInputs.sortDir.setValue(dir); //this will call createPreview()
                }
                else{
                    delete chartConfig[chartConfigRef];
                    pieInputs.sortDir.clear();
                    createPreview();
                }
            }
            else{
                chartConfig[chartConfigRef] = value;

                var k = pieInputs.key.getValue();
                var v = pieInputs.value.getValue();

                if (k && v){
                    k = (k+"").trim();
                    v = (v+"").trim();
                    if (k.length>0 && v.length>0){

                        var sortBy = config.chart.pieSort;
                        if (sortBy){
                            pieInputs.sort.setValue(sortBy, true);
                        }

                        var sortDir = config.chart.pieSortDir;
                        if (sortDir){
                            pieInputs.sortDir.setValue(sortDir, true);
                        }

                        createPreview();
                    }
                }

            }
        };
    };


  //**************************************************************************
  //** createPreview
  //**************************************************************************
    var createPreview = function(chart){

      //Clear the chart area
        if (chart){
            chart.clear();
        }
        else{
            var previewArea = editor.getChartArea();
            previewArea.innerHTML = "";
            chart = new bluewave.charts.PieChart(previewArea, {});
        }


      //Calculate total slices and set max to render
        numSlices = createKeyValueDataset(inputData[0], chartConfig.pieKey, chartConfig.pieValue).length;
        chartConfig.maximumSlices = getMaxSlices(chartConfig.maximumSlices);


      //Update max slices if the slices exceed available colors
        if (chartConfig.colors){
            var maxSlices = numSlices;
            if (maxSlices>chartConfig.colors.length) maxSlices = chartConfig.colors.length;
            if (chartConfig.maximumSlices>maxSlices) chartConfig.maximumSlices = maxSlices;
        }


      //Render chart
        if (inputData.length>0 && inputData[0].length>0){
            var record = inputData[0][0];
            var keys = new Set(Object.keys(record));
            if (keys.has(chartConfig.pieKey) &&
                keys.has(chartConfig.pieValue)){
                chart.update(chartConfig, inputData);
            }
        }
    };


  //**************************************************************************
  //** editStyle
  //**************************************************************************
    var editStyle = function(){

      //Create styleEditor as needed
        if (!styleEditor){
            styleEditor = new javaxt.dhtml.Window(document.body, {
                title: "Edit Style",
                width: 400,
                valign: "top",
                modal: false,
                resizable: false,
                style: config.style.window
            });
        }


      //Update form
        var body = styleEditor.getBody();
        body.innerHTML = "";


        var colorField = bluewave.utils.createColorField({
            colors: config.colors,
            style: config.style
        });



        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                    group: "General",
                    items: [
                        {
                            name: "color",
                            label: "Color",
                            type: colorField
                        },
                        {
                            name: "cutout",
                            label: "Cutout",
                            type: "text"
                        }
                    ]
                },
                {
                    group: "Slices",
                    items: [
                        {
                            name: "padding",
                            label: "Padding",
                            type: "text"
                        },
                        {
                            name: "maximumSlices",
                            label: "Max Slices",
                            type: "text"
                        },
                        {
                            name: "showOther",
                            label: "Show Other",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        }
                    ]
                },
                {
                    group: "Labels",
                    items: [
                        {
                            name: "labels",
                            label: "Show Labels",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "extendLines",
                            label: "Extend Lines",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "labelOffset",
                            label: "Label Offset",
                            type: "text"
                        }
                    ]
                }
            ]
        });


      //Set initial value for the color field
        colorField.setValue(JSON.stringify(chartConfig.colors));
        var colors = colorField.getValue();
        if (colors) colors = JSON.parse(colors);


      //Update cutout field (add slider) and set initial value
        createSlider("cutout", form, "%");
        var cutout = Math.round(chartConfig.pieCutout*100.0);
        form.findField("cutout").setValue(cutout);


        var labelField = form.findField("labels");
        var labels = chartConfig.showLabels;
        labelField.setValue(labels===true ? true : false);


        var extendLinesField = form.findField("extendLines");
        var extendLines = chartConfig.extendLines;
        extendLinesField.setValue(extendLines===true ? true : false);


        createSlider("labelOffset", form, "%", 0, 120, 1);
        var labelOffset = chartConfig.labelOffset;
        form.findField("labelOffset").setValue(labelOffset);


      //Set initial value for padding
        createSlider("padding", form, "%", 0, 100, 1);
        var padding = chartConfig.piePadding;
        var maxPadding = 5;
        padding = Math.round((padding/maxPadding)*100.0);
        form.findField("padding").setValue(padding);


        var showOtherField = form.findField("showOther");
        showOtherField.setValue(chartConfig.showOther===true ? true : false);


      //Set initial value for max slices
        var maxSlices = numSlices;
        if (colors && colors.length<maxSlices) maxSlices = colors.length;
        var maxSliceSlider = createSlider("maximumSlices", form, "", 1, maxSlices, 1);
        form.findField("maximumSlices").setValue(Math.min(maxSlices, getMaxSlices(chartConfig.maximumSlices)));


      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();
            chartConfig.pieCutout = settings.cutout/100;
            chartConfig.piePadding = (settings.padding*maxPadding)/100;
            chartConfig.maximumSlices = getMaxSlices(settings.maximumSlices);

            if (settings.labels==="true") {
                settings.labels = true;
                form.enableField("labelOffset");
                form.enableField("extendLines");
            }
            else if (settings.labels==="false") {
                settings.labels = false;
                form.disableField("labelOffset");
                form.disableField("extendLines");
            }
            chartConfig.showLabels = settings.labels;
            chartConfig.extendLines = settings.extendLines==="true";

            chartConfig.labelOffset = settings.labelOffset;

            if (settings.showOther==="true") settings.showOther = true;
            else if (settings.showOther==="false") settings.showOther = false;
            chartConfig.showOther = settings.showOther;


            var colors = settings.color ? JSON.parse(settings.color) : null;
            if (colors){
                chartConfig.colors = colors;

              //Update max slices config and slider as needed
                var maxSlices = numSlices;
                if (colors.length<numSlices) maxSlices = colors.length;
                maxSliceSlider.setAttribute("max", maxSlices+1);
                if (chartConfig.maximumSlices>maxSlices){
                    chartConfig.maximumSlices = maxSlices;
                    form.findField("maximumSlices").setValue(maxSlices, true);
                }

            }


            createPreview();
        };


        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** getMaxSlices
  //**************************************************************************
    var getMaxSlices = function(maximumSlices){
        maximumSlices = parseInt(maximumSlices+"");
        if (isNaN(maximumSlices) || maximumSlices<1 || maximumSlices>numSlices){
            maximumSlices = Math.min(numSlices, 10);
        }
        return maximumSlices;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var createTable = javaxt.dhtml.utils.createTable;
    var isString = javaxt.dhtml.utils.isString;
    var isArray = javaxt.dhtml.utils.isArray;

    var createKeyValueDataset = bluewave.chart.utils.createKeyValueDataset;
    var getType = bluewave.chart.utils.getType;

    var createEditor = bluewave.utils.createEditor;
    var createSlider = bluewave.utils.createSlider;
    var parseData = bluewave.utils.parseData;


    init();
};