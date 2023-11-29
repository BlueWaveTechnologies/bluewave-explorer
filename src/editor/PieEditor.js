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
        var valueFields = [];
        fields.forEach((field)=>{
            var values = [];
            data.forEach((d)=>{
                var val = d[field];
                values.push(val);
            });
            var type = getType(values);
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
            fields.forEach((val)=>{
                pieInputs.key.add(val,val);
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


        pieInputs.key.setValue(chartConfig.pieKey, true);
        if(typeof pieInputs.value == "object") {
            pieInputs.value.setValue(chartConfig.pieValue, true);
        }
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

        if (chart){
            chart.clear();
        }
        else{
            var previewArea = editor.getChartArea();
            previewArea.innerHTML = "";
            chart = new bluewave.charts.PieChart(previewArea, {});
        }

        chart.update(chartConfig, inputData);
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



      //Set initial value for padding and update
        createSlider("padding", form, "%", 0, 100, 1);
        var padding = chartConfig.piePadding;
        var maxPadding = 5;
        padding = Math.round((padding/maxPadding)*100.0);
        form.findField("padding").setValue(padding);


        var maxSliceOptField = form.findField("showOther");
        var showOther = chartConfig.showOther;
        maxSliceOptField.setValue(showOther===true ? true : false);

        var numSlices = inputData[0].length;
        //if (pieChart) numSlices = pieChart.getNumSlices();
        createSlider("maximumSlices", form, "", 1, numSlices, 1);
        var maximumSlices = parseInt(chartConfig.maximumSlices);
        if (isNaN(maximumSlices) || maximumSlices<1 || maximumSlices>numSlices){
            maximumSlices = numSlices;
        }
        form.findField("maximumSlices").setValue(maximumSlices);


      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();
            chartConfig.pieCutout = settings.cutout/100;


            chartConfig.piePadding = (settings.padding*maxPadding)/100;


            var maximumSlices = parseInt(settings.maximumSlices);
            if (isNaN(maximumSlices) || maximumSlices<1 || maximumSlices>numSlices){
                maximumSlices = numSlices;
            }
            chartConfig.maximumSlices = maximumSlices;


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


            chartConfig.colors = JSON.parse(settings.color);

            createPreview();
        };




        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var createTable = javaxt.dhtml.utils.createTable;

    var createEditor = bluewave.utils.createEditor;
    var createSlider = bluewave.utils.createSlider;
    var getType = bluewave.chart.utils.getType;
    var parseData = bluewave.utils.parseData;

    init();
};