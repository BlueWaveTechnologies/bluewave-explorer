if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  TreeMapEditor
//******************************************************************************
/**
 *   Panel used to create/edit treeMap charts
 *
 ******************************************************************************/

bluewave.editor.TreeMapEditor = function(parent, config) {
    var me = this;
    var defaultConfig = {
        panel: {

        },
        chart: {
            showTooltip: true,
            shape: "circle"
        }
    };

    var panel;
    var inputData = [];
    var previewArea;
    var treeMapChart;
    var optionsDiv;
    var treeMapInputs = {};
    var chartConfig = {};
    var styleEditor;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);
        chartConfig = config.chart;

      //Create table with 2 columns
        let table = createTable(parent);
        var tr = table.addRow();
        me.el = table;
        var td;


      //Left column (chart options)
        td = tr.addColumn();
        let div = document.createElement("div");
        div.className = "chart-editor-options";
        td.appendChild(div);
        optionsDiv = div;


      //Right column (chart preview)
        td = tr.addColumn();
        td.className = "chart-editor-preview";
        td.style.width = "100%";
        td.style.height = "100%";


      //Create panel in the right column
        panel = createDashboardItem(td,{
            width: "100%",
            height: "100%",
            title: "Untitled",
            settings: true
        });
        previewArea = panel.innerDiv;
        treeMapChart = new bluewave.charts.TreeMapChart(previewArea, {});
        treeMapChart.onClick = function(rect, data){
            editGroup(treeMapChart.getGroup(data.group));
        };
        panel.el.className = "";


      //Allow users to change the title associated with the chart
        addTextEditor(panel.title, function(title){
            panel.title.innerHTML = title;
            chartConfig.chartTitle = title;
        });


      //Watch for settings
        panel.settings.onclick = function(){
            if (chartConfig) editStyle();
        };
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
                var data = getData(inputNode.data, inputNode.config);
                if (data.length>0) inputData.push(data);
            }
        }


      //Set title
        if (chartConfig.chartTitle){
            panel.title.innerHTML = chartConfig.chartTitle;
        }

        createOptions(optionsDiv);
        createPreview();
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        chartConfig = {};
        panel.title.innerHTML = "Untitled";
        optionsDiv.innerHTML = "";

        if (treeMapChart) treeMapChart.clear();
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
        return previewArea;
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
  /** Used to render a bar treemap chart in a given dom element using the
   *  current chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.TreeMapChart(parent, {});
        chart.update(chartConfig, inputData[0]);
        return chart;
    };


  //**************************************************************************
  //** createOptions
  //**************************************************************************
    var createOptions = function(parent) {

        var data = inputData[0];
        var fields = Object.keys(data[0]);


      //Analyze dataset
        var keyFields = [];
        var valueFields = [];
        var groupByFields = [];

        fields.forEach((field)=>{
            var values = [];
            data.forEach((d)=>{
                var val = d[field];
                values.push(val);
            });

            var type = getType(values);
            if (type=="string") keyFields.push(field);
            if (type=="number" || type=="currency") valueFields.push(field);
            if (type=="string") groupByFields.push(field);

        });


      //Create form inputs
        var table = createTable(parent);
        table.style.height = "";
        createDropdown(table,"Key","key");
        createDropdown(table,"Value","value");
        createDropdown(table,"Group By","groupBy");


      //Populate key pulldown
        keyFields.forEach((field)=>{
            treeMapInputs.key.add(field,field);
        });


      //Populate value pulldown
        valueFields.forEach((field)=>{
            treeMapInputs.value.add(field,field);
        });

      //Populate groupBy pulldown
        groupByFields.forEach((field)=>{
            treeMapInputs.groupBy.add(field,field);
        });


      //Select default options
        if (!chartConfig.key) chartConfig.key = keyFields[0];
        treeMapInputs.key.setValue(chartConfig.key, true);

        if (!chartConfig.value) chartConfig.value = valueFields[0];
        treeMapInputs.value.setValue(chartConfig.value, true);

        if (chartConfig.groupBy){
            treeMapInputs.groupBy.setValue(chartConfig.groupBy, true);
        }
    };


  //**************************************************************************
  //** createDropdown
  //**************************************************************************
    var createDropdown = function(table, label, inputType){
        var td;

      //Add row for label
        td = table.addRow().addColumn();
        td.innerHTML= label+":";

      //Add row for pulldown
        td = table.addRow().addColumn();
        treeMapInputs[inputType] = new javaxt.dhtml.ComboBox(td, {
            style: config.style.combobox,
            readOnly: true
        });

        treeMapInputs[inputType].onChange = function(name, value){
            chartConfig[inputType] = value;
            createPreview();
        };
    };


  //**************************************************************************
  //** createPreview
  //**************************************************************************
    var createPreview = function(){
        if (chartConfig.key && chartConfig.value){
            var data = inputData[0];
            treeMapChart.update(chartConfig, data);
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





        var form = new javaxt.dhtml.Form(body, {
            style: config.style.form,
            items: [

                {
                  group: "Labels",
                  items: [
                        {
                            name: "groupLabel",
                            label: "Show Group",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "keyLabel",
                            label: "Show Key",
                            type: "checkbox",
                            options: [
                                {
                                    label: "",
                                    value: true
                                }

                            ]
                        },
                        {
                            name: "valueLabel",
                            label: "Show Value",
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




      //Set initial value for group label
        var groupLabelField = form.findField("groupLabel");
        var groupLabel = chartConfig.groupLabel;
        groupLabelField.setValue(groupLabel===true ? true : false);

      //Set initial value for key label
        var keyLabelField = form.findField("keyLabel");
        var keyLabel = chartConfig.keyLabel;
        keyLabelField.setValue(keyLabel===true ? true : false);

      //Set initial value for value label
        var valueLabelField = form.findField("valueLabel");
        var valueLabel = chartConfig.valueLabel;
        valueLabelField.setValue(valueLabel===true ? true : false);



      //Process onChange events
        form.onChange = function(){
            var settings = form.getData();

            if (settings.groupLabel==="true") settings.groupLabel = true;
            else settings.groupLabel = false;

            if (settings.valueLabel==="true") settings.valueLabel = true;
            else settings.valueLabel = false;

            if (settings.keyLabel==="true") settings.keyLabel = true;
            else settings.keyLabel = false;

            chartConfig.groupLabel = settings.groupLabel;
            chartConfig.keyLabel = settings.keyLabel;
            chartConfig.valueLabel = settings.valueLabel;

            createPreview();
        };




        styleEditor.showAt(108,57);
        form.resize();
    };


  //**************************************************************************
  //** editGroup
  //**************************************************************************
    var editGroup = function(arr){
        if (!arr || arr.length==0) return;
        //console.log(arr);
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var onRender = javaxt.dhtml.utils.onRender;
    var createTable = javaxt.dhtml.utils.createTable;
    var createDashboardItem = bluewave.utils.createDashboardItem;
    var addTextEditor = bluewave.utils.addTextEditor;
    var getType = bluewave.chart.utils.getType;
    var getData = bluewave.utils.getData;

    init();
};