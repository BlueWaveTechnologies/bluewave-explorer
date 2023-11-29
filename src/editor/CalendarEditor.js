if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  calendarEditor
//******************************************************************************
/**
 *   Panel used to edit calendar chart
 *
 ******************************************************************************/

bluewave.editor.CalendarEditor = function(parent, config) {
    var me = this;
    var defaultConfig = {
        panel: {

        },
        colors: bluewave.utils.getColorGradients(),
        chart: {
            showTooltip: true
        }
    };

    var editor;
    var inputData = [];
    var calendarInputs = {};
    var chartConfig = {};
    var styleEditor;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        defaultConfig.chart.colors = defaultConfig.colors.green.map((x) => x).reverse();
        config = merge(config, defaultConfig);
        chartConfig = config.chart;


      //Create editor
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
            }
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
  /** Used to render a calendar chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.CalendarChart(parent, {});
        createPreview(chart);
        return chart;
    };


  //**************************************************************************
  //** createOptions
  //**************************************************************************
    var createOptions = function(parent) {

        var data = inputData[0];
        var fields = Object.keys(data[0]);


      //Analyze dataset
        var dateFields = [];
        var valueFields = [];
        fields.forEach((field)=>{
            var values = [];
            data.forEach((d)=>{
                var val = d[field];
                values.push(val);
            });
            var type = getType(values);
            if (type=="date") dateFields.push(field);
            if (type=="number" || type=="currency") valueFields.push(field);
        });


      //Create form inputs
        var table = createTable(parent);
        table.style.height = "";

        createDropdown(table,"Date","date");
        createDropdown(table,"Value","value");


      //Populate date pulldown
        dateFields.forEach((field)=>{
            calendarInputs.date.add(field,field);
        });


      //Populate value pulldown
        valueFields.forEach((field)=>{
            calendarInputs.value.add(field,field);
        });


      //Select default options
        if (chartConfig.date){
            calendarInputs.date.setValue(chartConfig.date, false);
        }
        else{
            calendarInputs.date.setValue(dateFields[0], false);
        }
        if (chartConfig.value){
            calendarInputs.value.setValue(chartConfig.value, false);
        }
        else{
            calendarInputs.value.setValue(valueFields[0], false);
        }
    };


  //**************************************************************************
  //** createDropdown
  //**************************************************************************
    var createDropdown = function(table,displayName,inputType){
        var td;

        td = table.addRow().addColumn();
        td.innerHTML= displayName+":";

        td = table.addRow().addColumn();
        calendarInputs[inputType] = new javaxt.dhtml.ComboBox(td, {
            style: config.style.combobox,
            readOnly: true
        });
        calendarInputs[inputType].clear();
        calendarInputs[inputType].onChange = function(name, value){
            chartConfig[inputType] = value;
            createPreview();
        };
    };


  //**************************************************************************
  //** createPreview
  //**************************************************************************
    var createPreview = function(chart){

        if (chartConfig.date && chartConfig.value){

            if (chart){
                chart.clear();
            }
            else{
                var previewArea = editor.getChartArea();
                previewArea.innerHTML = "";
                chart = new bluewave.charts.CalendarChart(previewArea, {});
            }


            var data = inputData[0];
            chart.update(chartConfig, data);
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
                      }
                  ]
                },
                {
                  group: "Labels",
                  items: [
                        {
                            name: "dayLabel",
                            label: "Show Day",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "yearLabel",
                            label: "Show Year",
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


      //Set initial value for the color field
        colorField.setValue(JSON.stringify(chartConfig.colors));
        if (!colorField.getValue()){
            colorField.setValue(JSON.stringify(chartConfig.colors.map((x) => x).reverse()));
        }


      //Set initial value for Day label
        var dayLabelField = form.findField("dayLabel");
        var dayLabel = chartConfig.dayLabel;
        dayLabelField.setValue(dayLabel===true ? true : false);


      //Set initial value for Year label
        var yearLabelField = form.findField("yearLabel");
        var yearLabel = chartConfig.yearLabel;
        yearLabelField.setValue(yearLabel===true ? true : false);



      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();

            if (settings.dayLabel==="true") settings.dayLabel = true;
            else settings.dayLabel = false;

            if (settings.yearLabel==="true") settings.yearLabel = true;
            else settings.yearLabel = false;

            chartConfig.dayLabel = settings.dayLabel;
            chartConfig.yearLabel = settings.yearLabel;
            chartConfig.colors = JSON.parse(settings.color).reverse();

            createPreview();
        };




        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var clone = javaxt.dhtml.utils.merge;
    var createTable = javaxt.dhtml.utils.createTable;
    var createElement = javaxt.dhtml.utils.createElement;

    var createEditor = bluewave.utils.createEditor;
    var getType = bluewave.chart.utils.getType;
    var parseData = bluewave.utils.parseData;

    init();
};