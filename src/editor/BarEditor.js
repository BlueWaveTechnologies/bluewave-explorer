if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  BarEditor
//******************************************************************************
/**
 *   Panel used to edit bar charts
 *
 ******************************************************************************/

bluewave.editor.BarEditor = function(parent, config) {

    var me = this;
    var defaultConfig = {
        panel: {

        },
        chart: {
            showTooltip: true
        }
    };

    var editor;
    var inputData = [];
    var plotInputs = {};
    var chartConfig = {};
    var colorPicker;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);
        chartConfig = config.chart;


        if (!config) config = {};
        config = merge(config, defaultConfig);


      //Create editor
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


      //Set title
        if (chartConfig.chartTitle){
            editor.setTitle(chartConfig.chartTitle);
        }


        createForm(editor.getLeftPanel());
        createOptions();
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        chartConfig = {};
        plotInputs = {};


        if (colorPicker) colorPicker.hide();
        //if (styleEditor) styleEditor.hide();

        editor.clear();
    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Return chart configuration file
   */
    this.getConfig = function(){
        let copy = Object.assign({},chartConfig);
        return copy;
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
  /** Used to render a bar chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.BarChart(parent, {});
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
            // let labelN = `label${n}`;

            plotInputs[groupN].add("", "");

            let dataOptions = Object.keys(inputData[i][0]);
            dataOptions.forEach((val)=>{
                plotInputs[xAxisN].add(val, val);
                plotInputs[yAxisN].add(val, val);
                plotInputs[groupN].add(val, val);
            });

            plotInputs[xAxisN].setValue(chartConfig[xAxisN], true);
            plotInputs[yAxisN].setValue(chartConfig[yAxisN], true);

            if (chartConfig[groupN]){
                plotInputs[groupN].setValue(chartConfig[groupN], true);
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
                    group: "Series " + (i>0 ? n : 1),
                    items: [
                        createLabel("X-Axis"),
                        createDropdown(`xAxis${n}`, plotInputs),

                        createLabel("Y-Axis"),
                        createDropdown(`yAxis${n}`, plotInputs),

                        createLabel("Separate By"),
                        createDropdown(`group${n}`, plotInputs)
                    ]
                }
            );
        }


        var div = createElement("div", parent, {
            height: "100%",
            zIndex: 1
        });

        var form = new javaxt.dhtml.Form(div, {
            style: config.style.form,
            items: items
        });

        form.onChange = function(input, value){
            var key = input.name;
            chartConfig[key] = value;
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
            chart = new bluewave.charts.BarChart(previewArea, {});
            chart.onClick = function(bar, barID){
                editBar(barID);
            };
        }



        chart.update(chartConfig, inputData);
    };


  //**************************************************************************
  //** editStyle
  //**************************************************************************
    var editChart = function(){

      //Update form
        var styleEditor = getStyleEditor(config);
        var body = styleEditor.getBody();
        body.innerHTML = "";



      //Create layout dropdown
        var chartLayout = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: true
            }
        );
        chartLayout.add("Vertical", "vertical");
        chartLayout.add("Horizontal", "horizontal");
        chartLayout.setValue("vertical");


        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                    group: "General",
                    items: [
                        {
                            name: "layout",
                            label: "Chart Layout",
                            type: chartLayout
                        },
                        {
                            name: "borderRadius",
                            label: "Radius",
                            type: "text"
                        },
                        {
                            name: "stackValues",
                            label: "Stack Bars",
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
                            name: "yAxisAlign",
                            label: "Show On Right",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
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



      //Set form value for bar layout
        var layoutField = form.findField("layout");
        var layout = chartConfig.layout;
        layoutField.setValue(layout==="horizontal" ? "horizontal" : "vertical");

      //Create slider for border radius
        createSlider("borderRadius", form, "", 0, 20, 1);
        var borderRadius = parseInt(chartConfig.borderRadius+"");
        if (isNaN(borderRadius)) borderRadius = 0;
        form.findField("borderRadius").setValue(borderRadius);

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
        xLabelField.setValue(xLabel===true ? true : false);

      //Set intial value for yLabel
        var yLabelField = form.findField("yLabel");
        var yLabel = chartConfig.yLabel;
        yLabelField.setValue(yLabel===true ? true : false);

      //Set initial value for the y-axis alignment
        var yAxisAlignField = form.findField("yAxisAlign");
        var yAxisAlign = chartConfig.yAxisAlign;
        yAxisAlignField.setValue(yAxisAlign==="right" ? true : false);

        var stackField = form.findField("stackValues");
        var stack = chartConfig.stackValues;
        stackField.setValue(stack===true ? true : false);


        createSlider("xTicks", form, "", 0, 50, 1);
        var xTicks = parseInt(chartConfig.xTicks+"");
        if (isNaN(xTicks)) xTicks = 10;
        form.findField("xTicks").setValue(xTicks);

        createSlider("yTicks", form, "", 0, 50, 1);
        var yTicks = parseInt(chartConfig.yTicks+"");
        if (isNaN(yTicks)) yTicks = 10;
        form.findField("yTicks").setValue(yTicks);


      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();

          //Update form data
            if (settings.xGrid==="true") settings.xGrid = true;
            else settings.xGrid = false;

            if (settings.yGrid==="true") settings.yGrid = true;
            else settings.yGrid = false;

            if (settings.xLabel==="true") settings.xLabel = true;
            else settings.xLabel = false;

            if (settings.yLabel==="true") settings.yLabel = true;
            else settings.yLabel = false;

            if (settings.yAxisAlign) settings.yAxisAlign = "right";
            else settings.yAxisAlign = "left";

            if (settings.stackValues==="true") settings.stackValues = true;
            else settings.stackValues = false;


          //Update chartConfig
            chartConfig.layout = settings.layout;
            chartConfig.xGrid = settings.xGrid;
            chartConfig.yGrid = settings.yGrid;
            chartConfig.xLabel = settings.xLabel;
            chartConfig.yLabel = settings.yLabel;
            chartConfig.yAxisAlign = settings.yAxisAlign;
            chartConfig.stackValues = settings.stackValues;

            var borderRadius = bluewave.chart.utils.parseFloat(settings.borderRadius);
            if (!isNaN(borderRadius)) chartConfig.borderRadius = borderRadius;

            var xTicks = bluewave.chart.utils.parseFloat(settings.xTicks);
            if (!isNaN(xTicks)) chartConfig.xTicks = xTicks;

            var yTicks = bluewave.chart.utils.parseFloat(settings.yTicks);
            if (!isNaN(yTicks)) chartConfig.yTicks = yTicks;


          //Disable animation
            var animationSteps = chartConfig.animationSteps;
            chartConfig.animationSteps = 0;

          //Render preview
            createPreview();

          //Restore animation
            chartConfig.animationSteps = animationSteps;
        };


      //Render the styleEditor popup and resize the form
        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** editBar
  //**************************************************************************
    var editBar = function(datasetID){

      //Update form
        var styleEditor = getStyleEditor(config);
        var body = styleEditor.getBody();
        body.innerHTML = "";


      //Add style options
        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                    group: "Fill Style",
                    items: [
                        {
                            name: "barColor",
                            label: "Color",
                            type: new javaxt.dhtml.ComboBox(
                                createElement("div"),
                                {
                                    style: config.style.combobox
                                }
                            )
                        },
                        {
                            name: "fillOpacity",
                            label: "Opacity",
                            type: "text"
                        }
                    ]
                },
                {
                    group: "Border",
                    items: [
                        {
                            name: "borderRadius",
                            label: "Radius",
                            type: "text"
                        }
                    ]
                }
            ]
        });


        createColorOptions("barColor", form);

        createSlider("fillOpacity", form, "%");


        createSlider("borderRadius", form, "", 0, 50, 1);
        var borderRadius = chartConfig.borderRadius;
        if (isNaN(borderRadius)) borderRadius = 0;
        form.findField("borderRadius").setValue(borderRadius);


        if(datasetID !== null && datasetID !== undefined){

            let n = `${datasetID}`;

            var barColor = chartConfig["barColor" + n];
            if (!barColor) barColor = "#6699CC";
            chartConfig["barColor" + n] = barColor;
            form.findField("barColor").setValue(barColor);



            var fillOpacity = chartConfig["fillOpacity" + n];
            if (isNaN(fillOpacity)) fillOpacity = 1;
            chartConfig["fillOpacity" + n] = fillOpacity;
            form.findField("fillOpacity").setValue(fillOpacity*100);



            form.onChange = function(){
                let settings = form.getData();
                chartConfig["barColor" + n] = settings.barColor;
                chartConfig["fillOpacity" + n] = settings.fillOpacity/100;
                chartConfig.borderRadius = settings.borderRadius;
                createPreview();
            };
        }


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
    var createElement = javaxt.dhtml.utils.createElement;

    var createEditor = bluewave.utils.createEditor;
    var createSlider = bluewave.utils.createSlider;
    var getStyleEditor = bluewave.utils.getStyleEditor;
    var parseData = bluewave.utils.parseData;

    init();
};