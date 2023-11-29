if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  ScatterEditor
//******************************************************************************
/**
 *   Panel used to edit scatter chart
 *
 ******************************************************************************/

bluewave.editor.ScatterEditor = function(parent, config) {
    var me = this;
    var defaultConfig = {
        panel: {

        },
        chart: {
            pointColor: "#6699cc",
            pointRadius: 7,
            pointOpacity: 0.8,
            showRegLine: false,
            showTooltip: true
        }
    };

    var editor;
    var inputData = [];
    var plotInputs = {};
    var chartConfig = {};


    var styleEditor;
    var colorPicker;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);
        chartConfig = config.chart;



      //Create editor
        editor = createEditor(parent, {
            onSettings: function(){
                if (chartConfig) editChart();
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

        createOptions(editor.getLeftPanel());

    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        chartConfig = {};
        editor.clear();

        if (colorPicker) colorPicker.hide();
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
  /** Used to render a bar chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.ScatterChart(parent, {});
        createPreview(chart);
        return chart;
    };


  //**************************************************************************
  //** createOptions
  //**************************************************************************
    var createOptions = function(parent) {

        var table = createTable(parent);
        table.style.height = "";

        createDropdown(table,"xAxis","X-Axis",createPreview);
        createDropdown(table,"yAxis","Y-Axis",createPreview);


        var data = inputData[0];
        let dataOptions = Object.keys(data[0]);

        dataOptions.forEach((val)=>{
            plotInputs.xAxis.add(val,val);
            plotInputs.yAxis.add(val,val);
        });
        plotInputs.xAxis.setValue(chartConfig.xAxis, false);
        plotInputs.yAxis.setValue(chartConfig.yAxis, false);
    };


  //**************************************************************************
  //** createDropdown
  //**************************************************************************
    var createDropdown = function(table,inputType,displayName,callBack){
        var td;


        td = table.addRow().addColumn();
        td.innerHTML= displayName+":";

        td = table.addRow().addColumn();
        plotInputs[inputType] = new javaxt.dhtml.ComboBox(td, {
            style: config.style.combobox,
            readOnly: true
        });
        plotInputs[inputType].onChange = function(name,value){
            chartConfig[inputType] = value;
            callBack();
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
            chart = new bluewave.charts.ScatterChart(previewArea, {});
        }

        chart.update(chartConfig, inputData);
    };


  //**************************************************************************
  //** editChart
  //**************************************************************************
    var editChart = function(){


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




      //Create "Min Value" dropdown
        var xMinDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: false

            }
        );

        var xKeys = [];
        inputData.forEach(function (data, i){

            var n = i>0 ? (i+1) : "";
            let xAxisN = `xAxis${n}`;
            var xAxis = chartConfig[xAxisN];

            if (xAxis){
                data.forEach((d)=>{
                    xKeys.push(d[xAxis]);
                });
            }
        });

        var xType = getType(xKeys);
        if (xType=="number" || xType=="currency"){
            var minX = Number.MAX_VALUE;
            var maxX = 0;
            xKeys.forEach((key)=>{
                var n = bluewave.chart.utils.parseFloat(key);
                minX = Math.min(n, minX);
                maxX = Math.max(n, maxX);
            });

            xMinDropdown.add("0", 0);
            if (minX!=0) xMinDropdown.add(minX+"", minX);
            xMinDropdown.setValue(0);
        }




        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [
                {
                  group: "General",
                  items: [

                      {
                          name: "pointLabels",
                          label: "Display Point Labels",
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
                  group: "Analysis",
                  items: [

                      {
                          name: "showRegLine",
                          label: "Enable Regression Line",
                          type: "checkbox",
                          options: [
                              {
                                  label: "",
                                  value: true
                              }

                          ]
                      },

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
                          name: "pointOpacity",
                          label: "Point Opacity",
                          type: "text"
                      },
                      {
                          name: "pointRadius",
                          label: "Radius",
                          type: "text"
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

        var tagField = form.findField("pointLabels");
        var pointLabels = chartConfig.showPointLabels;
        tagField.setValue(pointLabels===true ? true : false);



      //Update color field (add colorPicker) and set initial value
        createColorOptions("pointColor", form);
        form.findField("pointColor").setValue(chartConfig.pointColor);


      //Add radius slider
        createSlider("pointRadius", form, "px", 0, 20, 1);
        var pointRadius = parseInt(chartConfig.pointRadius);
        if (isNaN(pointRadius) || pointRadius<1){
            pointRadius = defaultConfig.chart.pointRadius;
        }
        form.findField("pointRadius").setValue(pointRadius);


        createSlider("pointOpacity", form, "%");
        var pointOpacity = parseFloat(chartConfig.pointOpacity);
        if (isNaN(pointOpacity) || pointOpacity<0 || pointOpacity>100){
            pointOpacity = defaultConfig.chart.pointOpacity;
        }
        form.findField("pointOpacity").setValue(round(pointOpacity * 100,0));





      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();


            chartConfig.pointColor = settings.pointColor;
            chartConfig.pointOpacity = settings.pointOpacity/100;
            chartConfig.pointRadius = settings.pointRadius;


            if (settings.xGrid==="true") settings.xGrid = true;
            else settings.xGrid = false;

            if (settings.yGrid==="true") settings.yGrid = true;
            else settings.yGrid = false;

            if (settings.xLabel==="true") settings.xLabel = chartConfig.xAxis;
            else settings.xLabel = null;

            if (settings.yLabel==="true") settings.yLabel = chartConfig.yAxis;
            else settings.yLabel = null;

            if (settings.pointLabels==="true") settings.pointLabels = true;
            else settings.pointLabels = false;


            if (settings.showRegLine==="true") settings.showRegLine = true;
            else settings.showRegLine = false;


            chartConfig.xGrid = settings.xGrid;
            chartConfig.yGrid = settings.yGrid;
            chartConfig.xLabel = settings.xLabel;
            chartConfig.yLabel = settings.yLabel;
            chartConfig.pointLabels = settings.pointLabels;
            chartConfig.showRegLine = settings.showRegLine;


            var xMin = bluewave.chart.utils.parseFloat(xMinDropdown.getText());
            if (!isNaN(xMin)) chartConfig.xMin = xMin;

            createPreview();
        };



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
    var round = javaxt.dhtml.utils.round;
    var createTable = javaxt.dhtml.utils.createTable;
    var createElement = javaxt.dhtml.utils.createElement;

    var createEditor = bluewave.utils.createEditor;
    var createSlider = bluewave.utils.createSlider;
    var getType = bluewave.chart.utils.getType;
    var parseData = bluewave.utils.parseData;

    init();
};