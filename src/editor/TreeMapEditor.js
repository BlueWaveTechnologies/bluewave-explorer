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
        colors: bluewave.utils.getColorGradients(),
        chart: {
            showTooltip: true,
            shape: "circle"
        }
    };

    var editor;
    var inputData = [];
    var treeMapInputs = {};
    var chartConfig = {};
    var styleEditor;
    var legend;


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
  /** Used to render a bar treemap chart in a given dom element using the
   *  current chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.TreeMapChart(parent, {});
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
            if (type=="string" || type==null){
                keyFields.push({
                    name: field, values: new Set(values).size
                });
                groupByFields.push(field);
            }
            if (type=="number" || type=="currency") valueFields.push(field);

        });


      //Create form inputs
        var table = createTable(parent);
        table.style.height = "";
        createDropdown(table,"Key","key");
        createDropdown(table,"Value","value");
        createDropdown(table,"Group By","groupBy");


      //Populate key pulldown
        keyFields.sort(function(a, b){
            return a.values-b.values;
        });
        keyFields.forEach((field)=>{
            treeMapInputs.key.add(field.name,field.name);
        });


      //Populate value pulldown
        valueFields.forEach((field)=>{
            treeMapInputs.value.add(field,field);
        });


      //Populate groupBy pulldown
        treeMapInputs.groupBy.add("", "");
        groupByFields.forEach((field)=>{
            treeMapInputs.groupBy.add(field,field);
        });


      //Select default key value
        if (!chartConfig.key && keyFields.length>0){
            chartConfig.key = keyFields[0].name;
            treeMapInputs.key.setValue(chartConfig.key, true);
        }


      //Select default value field
        if (!chartConfig.value && valueFields.length>0){
            chartConfig.value = valueFields[0];
            treeMapInputs.value.setValue(chartConfig.value, true);
        }


      //Select default group by field
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
    var createPreview = function(chart){
        if (legend) legend.hide();


        if (chart){
            chart.clear();
        }
        else{
            var previewArea = editor.getChartArea();
            previewArea.innerHTML = "";
            chart = new bluewave.charts.TreeMapChart(previewArea, {});
            chart.getValueLabel = function(value, data){
                var val = bluewave.chart.utils.parseFloat(value);
                if (isNaN(val)) return value;
                return formatNumber(round(val, 2));
            };
            chart.onClick = function(rect, data){
                editGroup(chart.getGroup(data.group));
            };
        }



        if (chartConfig.key && chartConfig.value){
            var data = inputData[0];
            chart.update(chartConfig, data, function(){


              //Render legend as needed
                if (chartConfig.shape==="circle"){
                    var groups = chart.getGroups();
                    var groupNames = Object.keys(groups);
                    if (groupNames.length>1){
                        var rows = [];
                        groupNames.forEach((groupName)=>{
                            var arr = groups[groupName];
                            var value = 0;
                            var color = null;
                            arr.forEach((d)=>{
                                value += d.data.value;
                                if (!color){
                                    color = d.rect.style.fill;
                                }
                            });

                            rows.push({key: groupName, value: value, color: color});
                        });

                        rows.sort(function(a, b){
                            return b.value - a.value;
                        });

                        legend = createLegend(editor.getChartArea());
                        rows.forEach((row)=>{
                            legend.addItem(row.key, row.color);
                        });
                    }
                }

            });
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





      //Create shape dropdown
        var shapeDropdown = new javaxt.dhtml.ComboBox(
            createElement("div"),
            {
                style: config.style.combobox,
                readOnly: true

            }
        );
        shapeDropdown.add("Circular", "circle");
        shapeDropdown.add("Rectangular", "square");



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
                            name: "shape",
                            label: "Shape",
                            type: shapeDropdown
                        },
                        {
                            name: "color",
                            label: "Color",
                            type: colorField
                        },
                        {
                            name: "maxItems",
                            label: "Max Items",
                            type: "text"
                        },
                        {
                            name: "maxGroups",
                            label: "Max Groups",
                            type: "text"
                        }
                    ]
                },

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



      //Set initial value for the shape field
        var shapeField = form.findField("shape");
        var shape = chartConfig.shape;
        if (shape==="square"){
            shapeField.setValue("square");
            form.showField("groupLabel");
        }
        else{
            shapeField.setValue("circle");
            form.hideField("groupLabel");
        }


      //Set initial value for the color field
        colorField.setValue(JSON.stringify(chartConfig.colors));

        var maxItems = parseInt(chartConfig.maxItems+"");
        var maxItemField = form.findField("maxItems");
        maxItemField.setValue(isNaN(maxItems) ? "" : maxItems);

        var maxGroups = parseInt(chartConfig.maxGroups+"");
        var maxGroupField = form.findField("maxGroups");
        maxGroupField.setValue(isNaN(maxGroups) ? "" : maxGroups);


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

            if (settings.shape==="circle"){
                form.hideField("groupLabel");
            }
            else{
                form.showField("groupLabel");
            }

            var maxItems = parseInt(settings.maxItems+"");
            if (isNaN(maxItems)) maxItems = null;

            var maxGroups = parseInt(settings.maxGroups+"");
            if (isNaN(maxGroups)) maxGroups = null;

            if (settings.groupLabel==="true") settings.groupLabel = true;
            else settings.groupLabel = false;

            if (settings.valueLabel==="true") settings.valueLabel = true;
            else settings.valueLabel = false;

            if (settings.keyLabel==="true") settings.keyLabel = true;
            else settings.keyLabel = false;

            chartConfig.maxItems = settings.maxItems;
            chartConfig.maxGroups = settings.maxGroups;
            chartConfig.groupLabel = settings.groupLabel;
            chartConfig.keyLabel = settings.keyLabel;
            chartConfig.valueLabel = settings.valueLabel;
            chartConfig.shape = settings.shape;
            chartConfig.colors = JSON.parse(settings.color);

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
    var round = javaxt.dhtml.utils.round;
    var createTable = javaxt.dhtml.utils.createTable;
    var createElement = javaxt.dhtml.utils.createElement;

    var createEditor = bluewave.utils.createEditor;
    var createLegend = bluewave.utils.createLegend;
    var getType = bluewave.chart.utils.getType;
    var parseData = bluewave.utils.parseData;
    var formatNumber = bluewave.utils.formatNumber;

    init();
};