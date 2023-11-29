if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  LineEditor
//******************************************************************************
/**
 *   Panel used to edit line charts
 *
 ******************************************************************************/

bluewave.editor.LineEditor = function(parent, config) {

    var me = this;
    var defaultConfig = {
        panel: {

        },
        chart: {

        }
    };

    var editor;
    var inputData = [];
    var lineChart;
    var plotInputs = {};
    var chartConfig = {
        layers: []
    };
    var lineMap = []; //used to map lines in the chart to a layer in the config
    var colorPicker;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        editor = createEditor(parent, {
            onSettings: function(){
                editChart();
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
            }
        }



      //Create layers
        var addLayer = function(){
            chartConfig.layers.push({
                line: {fill:{}, point:{}}
            });
        };

        if (!chartConfig.layers){
            chartConfig.layers = [];
            for (var i=0; i<inputData.length; i++){
                addLayer();
            }
        }
        else{
            if (chartConfig.layers.length<inputData.length){
                var start = inputData.length-chartConfig.layers.length;
                for (var i=start; i<inputData.length; i++){
                    addLayer();
                }
            }
        }


      //Set title
        if (chartConfig.chartTitle){
            editor.setTitle(chartConfig.chartTitle);
        }


      //Enable tooltip
        chartConfig.showTooltip = true;

        createForm(editor.getLeftPanel());
        createOptions();
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        lineMap = [];
        chartConfig = {};
        plotInputs = {};

        if (colorPicker) colorPicker.hide();
        //if (styleEditor) styleEditor.hide();

        if (lineChart){
            lineChart.clear();
            lineChart = null;
        }

        editor.clear();
    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Returns chart configuration
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
  /** Used to render a line chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.LineChart(parent, {});
        createPreview(chart);
        return chart;
    };


  //**************************************************************************
  //** createOptions
  //**************************************************************************
    var createOptions = function() {

        for (let i=0; i<inputData.length; i++){
            var n = i>0 ? (i+1) : "";
            let xAxisN = `xAxis${n}`;
            let yAxisN = `yAxis${n}`;
            let groupN = `group${n}`;
            let labelN = `label${n}`;

            plotInputs[groupN].add("", "");

            let dataOptions = Object.keys(inputData[i][0]);
            dataOptions.forEach((val)=>{
                plotInputs[xAxisN].add(val, val);
                plotInputs[yAxisN].add(val, val);
                plotInputs[groupN].add(val, val);
            });


            plotInputs[xAxisN].setValue(chartConfig.layers[i].xAxis, true);
            plotInputs[yAxisN].setValue(chartConfig.layers[i].yAxis, true);

            if (chartConfig.layers[i].group){

              //Trigger onChange event to show/hide labels
                plotInputs[groupN].setValue(chartConfig.layers[i].group, false);
            }
            else{

              //Set default label
                var label = chartConfig.layers[i].line.label;
                if (!label) label = "Series " + (i+1);
                plotInputs[labelN].setValue(label, true);
            }
        }

        createPreview();
    };


  //**************************************************************************
  //** createForm
  //**************************************************************************
    var createForm = function(parent){

        var items = [];
        for (var i=0; i<inputData.length; i++){
            var n = i>0 ? (i+1) : "";
            items.push(
                {
                    group: "Series " + (i+1),
                    items: [
                        createLabel("X-Axis"),
                        createDropdown(`xAxis${n}`, plotInputs),

                        createLabel("Y-Axis"),
                        createDropdown(`yAxis${n}`, plotInputs),

                        createLabel("Separate By"),
                        createDropdown(`group${n}`, plotInputs),

                        createLabel("Name"),
                        { name: (`label${n}`), label: "", type: "text" }

                    ]
                }
            );
        }


        var div = createElement("div", parent);
        div.style.height = "100%";
        div.style.zIndex = 1;


        var form = new javaxt.dhtml.Form(div, {
            style: config.style.form,
            items: items
        });

        var formGroups = form.getGroups();


      //Update plotInputs with label field(s)
        for (var i=0; i<inputData.length; i++){
            var id = i>0 ? (i+1) : "";
            var fieldName = "label"+id;
            plotInputs[fieldName] = form.findField(fieldName);
        }


      //Watch for form change events
        form.onChange = function(input, value){

          //Get dataset ID associated with the input
            var datasetID;
            var foundGroup = false;
            formGroups.every(function(group){
                group.getRows().every(function(row){
                    if (row===input.row){
                        foundGroup = true;
                        var groupName = group.name;
                        var groupID = parseInt(groupName.substring(groupName.lastIndexOf(" ")));
                        datasetID = groupID-1;
                    }
                    return !foundGroup;
                });
                return !foundGroup;
            });


          //Get layer associated with the dataset ID
            var layer = chartConfig.layers[datasetID];
            var key = input.name;
            ["xAxis","yAxis","group","label"].forEach(function(label){
                var idx = key.indexOf(label);

                if (key.includes(label)){
                    if (label=="label"){
                        layer.line.label = value;
                    }
                    else{
                        layer[label] = value;
                    }
                }
            });




          //Special case for "Separate By" option. Show/Hide the label field.
            var key = input.name;
            var idx = key.indexOf("group");
            if (idx>-1){
                var id = key.substring("group".length);
                var labelField = form.findField("label"+id);
                var labelText = labelField.row.previousSibling;
                if (!labelField.hide){
                    addShowHide(labelField.row);
                    addShowHide(labelText);
                }


                if (value){
                    labelField.row.hide();
                    labelText.hide();
                }
                else{
                    labelField.row.show();
                    labelText.show();
                }

                form.resize();
            }


            createPreview();
        };
    };


  //**************************************************************************
  //** createLabel
  //**************************************************************************
    var createLabel = function(label){
        var row = createElement("div", "form-label");
        row.innerText = label + ":";
        return {
            name: "",
            label: "",
            type: {
                getValue: function(){},
                setValue: function(){},
                el: row
            }
        };
    };


  //**************************************************************************
  //** createDropdown
  //**************************************************************************
    var createDropdown = function(inputType,input){
        input[inputType] = new javaxt.dhtml.ComboBox(createElement("div"), {
            style: config.style.combobox,
            readOnly: true
        });
        return {
            name: inputType,
            label: "",
            type: input[inputType]
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
            chart = new bluewave.charts.LineChart(previewArea, chartConfig);
            chart.onClick = function(el, lineID){
                var line = chart.getLayers()[lineID+""].line;
                var layerID = lineMap[lineID].layer;
                editLine(line, layerID);
            };

            //chart.setConfig(chartConfig);
            lineChart = chart;
        }



        var colors = bluewave.utils.getColorPalette(true);
        var addLine = function(line, data, xAxis, yAxis, layerID){
            chart.addLine(line, data, xAxis, yAxis);
            lineMap.push({
                layer: layerID
            });
        };



      //Add lines
        var layers = chartConfig.layers;
        inputData.forEach(function (data, i){

            let layer = layers[i];
            if (layer.xAxis && layer.yAxis){


                if (layer.group){



                    var groupData = [];
                    var map = d3.group(data, d => d[layer.group]);
                    for (const key of map.keys()) {
                        groupData.push({
                            key: key,
                            values: map.get(key)
                        });
                    }


                    var subgroups = groupData.map(function(d) { return d["key"]; });


                    groupData.forEach(function(g, j){
                        var d = g.values;
                        let line = new bluewave.chart.Line();
                        line.setColor(colors[j % colors.length]);
                        line.setLabel(subgroups[j]);
                        addLine(line, d, layer.xAxis, layer.yAxis, i);
                    });

                }
                else{


                    if (!layer.line) layer.line = {};

                    var lineColor = layer.line.color;
                    if (!lineColor){
                        lineColor = colors[i % colors.length];
                        layer.line.color = lineColor;
                    }

                    let line = new bluewave.chart.Line(layer.line);
                    addLine(line, data, layer.xAxis, layer.yAxis, i);
                }


            }
        });

        chart.update();
    };


  //**************************************************************************
  //** editChart
  //**************************************************************************
    var editChart = function(){



      //Update form
        var styleEditor = getStyleEditor(config);
        var body = styleEditor.getBody();
        body.innerHTML = "";


      //Create scaling dropdown
        var scaleDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: true

            }
        );
        scaleDropdown.add("Linear", "linear");
        scaleDropdown.add("Logarithmic", "logarithmic");
        scaleDropdown.setValue("linear");



      //Create "Min Value" dropdown for the x-axis
        var xMinDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: false

            }
        );
        setMinValue("x", xMinDropdown);

      //Create "Min Value" dropdown for the y-axis
        var yMinDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: false

            }
        );
        setMinValue("y", yMinDropdown);



        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                    group: "General",
                    items: [

                        {
                            name: "scaleOptions",
                            label: "Scaling Options",
                            type: scaleDropdown
                        },
                        {
                            name: "endTags",
                            label: "Display End Tags",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true,
                                    checked: true
                                }

                            ]
                        },
                        {
                            name: "accumulate",
                            label: "Accumulate Values",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true,
                                    checked: false
                                }

                            ]
                        },
                        {
                            name: "stack",
                            label: "Stack Lines",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true,
                                    checked: false
                                }

                            ]
                        }


                    ]
                },
                {
                    group: "X-Axis",
                    items: [

                        {
                            name: "xLabel",
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
                            name: "xGrid",
                            label: "Show Grid Lines",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "xMin",
                            label: "Min Value",
                            type: xMinDropdown
                        },
                        {
                            name: "xTicks",
                            label: "Ticks",
                            type: "text"
                        }
                    ]
                },

                {
                    group: "Y-Axis",
                    items: [
                        {
                            name: "yLabel",
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
                            name: "yGrid",
                            label: "Show Grid Lines",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "yMin",
                            label: "Min Value",
                            type: yMinDropdown
                        },
                        {
                            name: "yTicks",
                            label: "Ticks",
                            type: "text"
                        }
                    ]
                }


            ]
        });


      //Set initial value for X-gridline
        var xGridField = form.findField("xGrid");
        var xGrid = chartConfig.xGrid;
        xGridField.setValue(xGrid===true ? true : false);

      //Set initial value for Y-gridline
        var yGridField = form.findField("yGrid");
        var yGrid = chartConfig.yGrid;
        yGridField.setValue(yGrid===true ? true : false);

      //Set intial value for xLabel
        var xLabelField = form.findField("xLabel");
        var xLabel = chartConfig.xLabel;
        xLabelField.setValue(xLabel ? true : false);

      //Set intial value for yLabel
        var yLabelField = form.findField("yLabel");
        var yLabel = chartConfig.yLabel;
        yLabelField.setValue(yLabel ? true : false);

        var tagField = form.findField("endTags");
        var endTags = chartConfig.endTags;
        tagField.setValue(endTags===true ? true : false);

        var stackField = form.findField("stack");
        var stack = chartConfig.stackValues;
        stackField.setValue(stack===true ? true : false);

        var accumulateField = form.findField("accumulate");
        var accumulate = chartConfig.accumulateValues;
        accumulateField.setValue(accumulate===true ? true : false);

        var scalingField = form.findField("scaleOptions");
        var scale = chartConfig.scaling;
        scalingField.setValue(scale==="logarithmic" ? "logarithmic" : "linear");

        createSlider("xTicks", form, "", 0, 50, 1);
        var xTicks = chartConfig.xTicks;
        if (isNaN(xTicks)) xTicks = 10;
        form.findField("xTicks").setValue(xTicks);

        createSlider("yTicks", form, "", 0, 50, 1);
        var yTicks = chartConfig.yTicks;
        if (isNaN(yTicks)) yTicks = 10;
        form.findField("yTicks").setValue(yTicks);


      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();

            if (settings.xGrid==="true") settings.xGrid = true;
            else settings.xGrid = false;

            if (settings.yGrid==="true") settings.yGrid = true;
            else settings.yGrid = false;

            if (settings.xLabel) settings.xLabel = true;
            else settings.xLabel = false;

            if (settings.yLabel) settings.yLabel = true;
            else settings.yLabel = false;

            if (settings.endTags==="true") settings.endTags = true;
            else settings.endTags = false;

            if (settings.stack==="true") settings.stack = true;
            else settings.stack = false;

            if (settings.accumulate==="true") settings.accumulate = true;
            else settings.accumulate = false;

            chartConfig.scaling = settings.scaleOptions;
            chartConfig.xGrid = settings.xGrid;
            chartConfig.yGrid = settings.yGrid;
            chartConfig.xLabel = settings.xLabel;
            chartConfig.yLabel = settings.yLabel;
            chartConfig.endTags = settings.endTags;
            chartConfig.stackValues = settings.stack;
            chartConfig.accumulateValues = settings.accumulate;
            if (chartConfig.xLabel) chartConfig.xLabel = chartConfig.layers[0].xAxis;
            if (chartConfig.yLabel) chartConfig.yLabel = chartConfig.layers[0].yAxis;
            chartConfig.xTicks = settings.xTicks;
            chartConfig.yTicks = settings.yTicks;


            var xMin = bluewave.chart.utils.parseFloat(xMinDropdown.getText());
            if (!isNaN(xMin)) chartConfig.xMin = xMin;

            var yMin = bluewave.chart.utils.parseFloat(yMinDropdown.getText());
            if (!isNaN(yMin)) chartConfig.yMin = yMin;

            createPreview();
        };


      //Render the styleEditor popup and resize the form
        styleEditor.showAt(108,57);
        form.resize();

    };


  //**************************************************************************
  //** setMinValue
  //**************************************************************************
  /** Used to update the pulldown options for a given combobox
   *  @param axis Either "x" or "y"
   *  @param dropdown Either xMinDropdown
   */
    var setMinValue = function(axis, dropdown){
        var keys = [];
        var layers = chartConfig.layers;
        inputData.forEach(function (data, i){
            let layer = layers[i];
            if (layer[axis+"Axis"]){
                data.forEach((d)=>{
                    keys.push(d[layer[axis+"Axis"]]);
                });
            }
        });

        var xType = getType(keys);
        if (xType=="number" || xType=="currency"){
            var minVal = Number.MAX_VALUE;
            var maxVal = 0;
            keys.forEach((key)=>{
                var n = bluewave.chart.utils.parseFloat(key);
                minVal = Math.min(n, minVal);
                maxVal = Math.max(n, maxVal);
            });

            dropdown.add("0", 0);
            if (minVal!=0) dropdown.add(minVal+"", minVal);

            var currVal = bluewave.chart.utils.parseFloat(chartConfig[axis+"Min"]);
            if (isNaN(currVal)) dropdown.setValue(0);
            else{
                dropdown.add(currVal+"", currVal);
                dropdown.setValue(currVal);
            }
        }
    };


  //**************************************************************************
  //** editLine
  //**************************************************************************
    var editLine = function(line, layerID){

      //Update form
        var styleEditor = getStyleEditor(config);
        var body = styleEditor.getBody();
        body.innerHTML = "";


      //Create dropdown for line style
        var lineDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: true

            }
        );
        lineDropdown.add("Solid", "solid");
        lineDropdown.add("Dashed", "dashed");
        lineDropdown.add("Dotted", "dotted");
        lineDropdown.setValue("solid");


      //Create dropdown for smoothing options
        var smoothingDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: true

            }
        );
        smoothingDropdown.add("None", "none");
        smoothingDropdown.add("Simple Spline", "spline");
        smoothingDropdown.add("Moving Average", "movingAverage");
        smoothingDropdown.add("Kernel Density Estimation", "kde");
        smoothingDropdown.setValue("none");


      //Add style options
        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                    group: "Stroke",
                    items: [
                        {
                            name: "lineStyle",
                            label: "Type",
                            type: lineDropdown
                        },
                        {
                            name: "lineColor",
                            label: "Color",
                            type: new javaxt.dhtml.ComboBox(
                                createElement("div"),
                                {
                                    style: config.style.combobox
                                }
                            )
                        },
                        {
                            name: "lineThickness",
                            label: "Thickness",
                            type: "text"
                        },
                        {
                            name: "lineOpacity",
                            label: "Opacity",
                            type: "text"
                        }
                    ]
                },
                {
                    group: "Points",
                    items: [
                        {
                            name: "pointColor",
                            label: "Color",
                            type: new javaxt.dhtml.ComboBox(
                                createElement("div"),
                                {
                                    style: config.style.combobox
                                }
                            )
                        },
                        {
                            name: "pointRadius",
                            label: "Radius",
                            type: "text"
                        }

                    ]
                },
                {
                    group: "Fill",
                    items: [

                        {
                            name: "startOpacity",
                            label: "Start Opacity",
                            type: "text"
                        },
                        {
                            name: "endOpacity",
                            label: "End Opacity",
                            type: "text"
                        }
                    ]
                },
                {
                    group: "Smoothing",
                    items: [
                        {
                            name: "smoothingType",
                            label: "Type",
                            type: smoothingDropdown
                        },
                        {
                            name: "smoothingValue",
                            label: "Factor",
                            type: "text"
                        }
                    ]
                }
            ]
        });



      //Update color field (add colorPicker) and set initial value
        createColorOptions("lineColor", form);
        createColorOptions("pointColor", form);


      //Get line config
        var lineConfig = line.getConfig();


      //Update lineWidth field (add slider) and set initial value
        createSlider("lineThickness", form, "px", 1, 10, 1);
        var thickness = lineConfig.width;
        if (isNaN(thickness)) thickness = 1;
        form.findField("lineThickness").setValue(thickness);


      //Add opacity sliders
        createSlider("lineOpacity", form, "%");
        var opacity = lineConfig.opacity;
        if (isNaN(opacity)) opacity = 1;
        form.findField("lineOpacity").setValue(opacity*100);


        createSlider("startOpacity", form, "%");
        var startOpacity = lineConfig.fill.startOpacity;
        if (isNaN(startOpacity)) startOpacity = 0;
        form.findField("startOpacity").setValue(startOpacity*100);


        createSlider("endOpacity", form, "%");
        var endOpacity = lineConfig.fill.endOpacity;
        if (isNaN(endOpacity)) endOpacity = 0;
        form.findField("endOpacity").setValue(endOpacity*100);


      //Add radius slider
        createSlider("pointRadius", form, "px", 0, 10, 1);
        var pointRadius = lineConfig.point.radius;
        if (isNaN(pointRadius)) pointRadius = 0;
        form.findField("pointRadius").setValue(pointRadius);


      //Add smoothing slider
        var smoothingField = form.findField("smoothingValue");
        var smoothingSlider = createSlider("smoothingValue", form, "", 0, 100, 1);
        var smoothingValue = lineConfig.smoothingValue;
        if (isNaN(smoothingValue)) smoothingValue = 0;
        smoothingField.setValue(smoothingValue);


        form.findField("lineColor").setValue(lineConfig.color);
        form.findField("pointColor").setValue(lineConfig.point.color);
        form.findField("pointRadius").setValue(lineConfig.point.radius);
        form.findField("lineStyle").setValue(lineConfig.style);
        form.findField("lineThickness").setValue(lineConfig.width);
        form.findField("lineOpacity").setValue(lineConfig.opacity*100);
        form.findField("startOpacity").setValue(lineConfig.fill.startOpacity*100);
        form.findField("endOpacity").setValue(lineConfig.fill.endOpacity*100);



        var smoothingType = lineConfig.smoothing;
        if (smoothingType){
            form.findField("smoothingType").setValue(smoothingType);
            var smoothingValue = lineConfig.smoothingValue;
            if (isNaN(smoothingValue)) smoothingValue = 0;
            smoothingField.setValue(smoothingValue);
        }
        else{
            smoothingField.setValue(0);
            form.disableField("smoothingValue");
            smoothingSlider.disabled = true;
        }


        form.onChange = function(){
            let settings = form.getData();

            lineConfig.color = settings.lineColor;
            lineConfig.style = settings.lineStyle;
            lineConfig.width = settings.lineThickness;
            lineConfig.opacity = settings.lineOpacity/100;

            lineConfig.fill.color = settings.lineColor;
            lineConfig.fill.startOpacity = settings.startOpacity/100;
            lineConfig.fill.endOpacity = settings.endOpacity/100;

            lineConfig.point.color = settings.pointColor;
            lineConfig.point.radius = settings.pointRadius;

            var smoothingType = settings.smoothingType;
            if (smoothingType==="none" || smoothingType==="spline"){
                lineConfig.smoothing = smoothingType;
                lineConfig.smoothingValue = 0;
                form.disableField("smoothingValue");
                smoothingSlider.disabled = true;
            }
            else {
                lineConfig.smoothing = smoothingType;
                lineConfig.smoothingValue = settings.smoothingValue;
                form.enableField("smoothingValue");
                smoothingSlider.disabled = false;
            }
            smoothingSlider.focus();



          //Update chart config
            line.setConfig(lineConfig);
            var layer = chartConfig.layers[layerID];
            if (layer.group){
                //TODO: Persist styles for individual lines in a group
            }
            else{
                chartConfig.layers[layerID].line = line.getConfig();
            }


          //Render updates
            createPreview();
        };



      //Render the styleEditor popup and resize the form
        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** createColorOptions
  //**************************************************************************
  /** Creates a custom form input using a combobox
   */
    var createColorOptions = function(inputName, form){
        bluewave.utils.createColorOptions(inputName, form, function(colorField){
            if (!colorPicker) colorPicker = bluewave.utils.createColorPickerCallout(config);
            var rect = javaxt.dhtml.utils.getRect(colorField.row);
            var x = rect.x + rect.width + 15;
            var y = rect.y + (rect.height/2);
            colorPicker.showAt(x, y, "right", "middle");
            colorPicker.setColor(colorField.getValue());
            colorPicker.onChange = function(color){
                colorField.setValue(color);
            };
        });
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var createElement = javaxt.dhtml.utils.createElement;

    var createEditor = bluewave.utils.createEditor;
    var createSlider = bluewave.utils.createSlider;
    var getStyleEditor = bluewave.utils.getStyleEditor;
    var getType = bluewave.chart.utils.getType;
    var parseData = bluewave.utils.parseData;

    init();
};