if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  MapEditor
//******************************************************************************
/**
 *   Panel used to create Map charts
 *
 ******************************************************************************/

 bluewave.editor.MapEditor = function(parent, config) {

    var me = this;
    var defaultConfig = {
        panel: {

        },
        colors: {
            red: d3.schemeReds[7],
            blue: d3.schemeBlues[7]
        },
        chart: {
            style: {
                backgroundColor: "#fff",
                landColor: "#dedde0"
            }
        }
    };

    var chartConfig = {};

    var panel;
    var previewArea;
    var mapChart;
    var inputData = [];


    var mapInputs = {}; //Map of form inputs (rows with comboboxes)
    var styleEditor, colorPicker; //popup windows
    var counties, states, countries; //topojson
    var options = []; //aggregation options



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


      //Create left panel with map options
        td = tr.addColumn();
        let div = document.createElement("div");
        div.className = "chart-editor-options";
        td.appendChild(div);
        createInput(div,"mapType","Map Type",showHideDropDowns);
        createInput(div,"mapLevel","Map Level",showHideDropDowns);
        createInput(div,"pointData", "Point Data",showHideDropDowns);
        createInput(div,"latitude","Latitude",createMapPreview,"lat");
        createInput(div,"longitude","Longitude",createMapPreview,"long");
        createInput(div,"mapLocation","Location Data",createMapPreview);
        createInput(div,"mapValue","Value",createMapPreview);
        createInput(div,"mapProjectionName","Projection",createMapPreview);


      //Create main panel with map
        td = tr.addColumn();
        td.className = "chart-editor-preview";
        td.style.width = "100%";
        td.style.height = "100%";
        panel = createDashboardItem(td,{
            width: "100%",
            height: "100%",
            title: "Untitled",
            settings: true
        });
        panel.el.className = "";
        previewArea = panel.innerDiv;
        mapChart = new bluewave.charts.MapChart(previewArea, chartConfig);
        mapChart.disablePan();


      //Allow users to change the title associated with the chart
        addTextEditor(panel.title, function(title){
            panel.title.innerHTML = title;
            chartConfig.chartTitle = title;
        });


      //Watch for settings
        panel.settings.onclick = function(){
            if (chartConfig) editStyle(chartConfig.mapType, chartConfig.mapLevel);
        };
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        inputData = [];
        chartConfig = {};
        panel.title.innerHTML = "Untitled";

      //Clear map inputs
        if (mapInputs){
            for (var key in mapInputs) {
                if (mapInputs.hasOwnProperty(key)){
                    var mapInput = mapInputs[key];
                    if (mapInput){
                        if (mapInput.clear) mapInput.clear();
                        if (mapInput.hide) mapInput.hide();
                    }
                }
            }
        }

      //Clear map preview
        if (mapChart) mapChart.clear();
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
        inputData = [];
        for (var key in node.inputs) {
            if (node.inputs.hasOwnProperty(key)){
                var input = node.inputs[key];
                var csv = input.csv;
                if (csv === undefined){

                  //Special case for supply chain data
                    var inputConfig = input.config;
                    if (inputConfig) inputData.push(inputConfig);
                }
                else {
                    if (typeof csv === "string"){
                        inputData.push(d3.csvParse(csv));
                    }
                }
            }
        }




      //Set title
        if (chartConfig.chartTitle){
            panel.title.innerHTML = chartConfig.chartTitle;
        }


        chartConfig.mapLevel = getMapLevel(chartConfig);


      //Populate pulldowns
        var data = inputData[0];
        if (isArray(data)){


          //Analyze dataset
            var numericFields = [];
            var stringFields = [];
            Object.keys(data[0]).forEach((field)=>{
                var values = [];
                data.forEach((d)=>{
                    var val = d[field];
                    values.push(val);
                });

                var type = getType(values);
                if (type=="string") stringFields.push(field);
                if (type=="number") numericFields.push(field);
            });


          //Populate numeric pulldowns
            numericFields.forEach((field)=>{
                mapInputs.lat.add(field, field);
                mapInputs.long.add(field, field);
                mapInputs.mapValue.add(field, field);
            });


          //Populate string pulldowns
            stringFields.forEach((field)=>{
                mapInputs.mapLocation.add(field, field);
            });


            mapInputs.mapType.add("Point", "Point");
            mapInputs.mapType.add("Area", "Area");

            mapInputs.pointData.add("Geographic Coordinates", "geoCoords");
            mapInputs.pointData.add("Admin Area", "adminArea");

            mapInputs.mapLevel.add("States", "counties");
            mapInputs.mapLevel.add("Country", "states");
            mapInputs.mapLevel.add("World", "world");

        }
        else{ //input from supply chain editor

            chartConfig.mapType = "Links";
            chartConfig.mapValue = "quantity";
            chartConfig.mapLevel = "world";

            mapInputs.mapType.add("Links","Links");
            mapInputs.mapValue.add("quantity", "quantity");

            mapInputs.mapLevel.add("Country", "states");
            mapInputs.mapLevel.add("World", "world");
        }


      //Show default pulldowns
        mapInputs.mapType.show();
        mapInputs.mapLevel.show();
        mapInputs.mapValue.show();
        if (chartConfig.mapType==="Point"){
            mapInputs.pointData.show();
            if(chartConfig.pointData==="geoCoords"){
                if (chartConfig.latitude && chartConfig.longitude){
                    mapInputs.lat.show();
                    mapInputs.long.show();
                }
            }
        }


      //Set default values
        mapInputs.mapType.setValue(chartConfig.mapType, false);
        mapInputs.mapLevel.setValue(chartConfig.mapLevel, true);
        mapInputs.mapValue.setValue(chartConfig.mapValue, true);
        mapInputs.pointData.setValue(chartConfig.pointData, true);
        mapInputs.lat.setValue(chartConfig.latitude, true);
        mapInputs.long.setValue(chartConfig.longitude, true);


      //Render map
        createMapPreview();
    };


  //**************************************************************************
  //** resize
  //**************************************************************************
    this.resize = function(){
        if (mapChart) mapChart.resize();
    };


  //**************************************************************************
  //** createInput
  //**************************************************************************
    var createInput = function(parent, chartConfigRef, displayName, onChange, inputType){
        if (!inputType) inputType = chartConfigRef;

        var row = document.createElement("div");
        parent.appendChild(row);
        addShowHide(row);

        var label = document.createElement("label");
        label.innerText = displayName + ":";
        row.appendChild(label);

        var input = new javaxt.dhtml.ComboBox(row, {
            style: config.style.combobox,
            readOnly: true
        });
        input.onChange = function(name,value){
            chartConfig[chartConfigRef] = value;
            var args = [];
            if (onChange===showHideDropDowns) args = [inputType, name, value];
            onChange.apply(input, args);
        };

        var show = input.show;
        input.show = function(){
            show();
            row.show();
        };

        var hide = input.hide;
        input.hide = function(){
            hide();
            row.hide();
        };

        input.hide();


        mapInputs[inputType] = input;
    };


  //**************************************************************************
  //** showHideDropDowns
  //**************************************************************************
    var showHideDropDowns = function(inputType, name, value){
        if (inputType==="mapType"){

            if(value==="Point"){
              //Show the combox box inputs
                mapInputs.mapLocation.hide();
                mapInputs.mapValue.show();
                mapInputs.pointData.show();

            }
            else if(value==="Area"){
                mapInputs.lat.hide();
                mapInputs.long.hide();
                mapInputs.mapLocation.show();
                mapInputs.mapValue.show();
                mapInputs.pointData.hide();
            }
        }
        else if (inputType==="pointData"){

            if(value==="geoCoords"){
                mapInputs.lat.show();
                mapInputs.long.show();
                mapInputs.mapLocation.hide();

            }
            else if(value==="adminArea"){
                mapInputs.lat.hide();
                mapInputs.long.hide();
                mapInputs.mapLocation.show();

            }
        }
        else if (inputType==="mapLevel"){
            delete chartConfig.lon;
            delete chartConfig.lat;
            createMapPreview();
        }
    };


  //**************************************************************************
  //** createMapPreview
  //**************************************************************************
    var createMapPreview = function(chart){
        if (!chartConfig.mapType) return;
        if (!chartConfig.mapLevel) return;
        if (chartConfig.mapType==="Point" && chartConfig.pointData===null) return;
        if (chartConfig.mapType==="Point" && (chartConfig.pointData==="geoCoords" &&
            (chartConfig.latitude===null || chartConfig.longitude===null || chartConfig.mapValue===null))){
            return;
        }
        if (chartConfig.mapType==="Point" && (chartConfig.pointData==="adminArea" &&
            (chartConfig.mapLocation===null || chartConfig.mapValue===null))){
            return;
        }
        if(chartConfig.mapType==="Area" && (chartConfig.mapValue===null ||
            chartConfig.mapLocation===null)){
            return;
        }
        if(chartConfig.mapType==="Links" && (chartConfig.mapValue==null ||
            chartConfig.mapLocation===null)){
            return;
        }

        getMapData(()=>{
            if (!(chart instanceof bluewave.charts.MapChart)) chart = mapChart;
            update(chart, inputData[0]);
        });
    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Return chart configuration
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
  /** Used to render a map chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
        var chart = new bluewave.charts.MapChart(parent, chartConfig);
        createMapPreview(chart);
        return chart;
    };


  //**************************************************************************
  //** editStyle
  //**************************************************************************
    var editStyle = function(mapType, mapLevel){

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


      //Create form
        var form;
        var body = styleEditor.getBody();
        body.innerHTML = "";


        var mapColors = {
            group: "Map Colors",
            items: [
                {
                    name: "backgroundColor",
                    label: "Background",
                    type: new javaxt.dhtml.ComboBox(
                        document.createElement("div"),
                        {
                            style: config.style.combobox
                        }
                    )
                },
                {
                    name: "landColor",
                    label: "Land",
                    type: new javaxt.dhtml.ComboBox(
                        document.createElement("div"),
                        {
                            style: config.style.combobox
                        }
                    )
                }
            ]
        };

        var mapCenter = {
            group: "Map Center",
            items: [
                {
                     name: "centerHorizontal",
                     label: "Longitude",
                     type: "text"
                },
                {
                     name: "centerVertical",
                     label: "Latitude",
                     type: "text"
                }
            ]
        };



        if (mapType==="Point"){

            var formItems = [
                {
                    group: "Point Style",
                    items: [
                        {
                            name: "color",
                            label: "Color",
                            type: new javaxt.dhtml.ComboBox(
                                document.createElement("div"),
                                {
                                    style: config.style.combobox
                                }
                            )
                        },
                        {
                            name: "radius",
                            label: "Radius",
                            type: "text"
                        },
                        {
                            name: "opacity",
                            label: "Opacity",
                            type: "text"
                        },
                         {
                             name: "outlineWidth",
                             label: "Border Width",
                             type: "text"
                         },
                         {
                             name: "outlineColor",
                             label: "Border Color",
                             type: new javaxt.dhtml.ComboBox(
                                 document.createElement("div"),
                                 {
                                     style: config.style.combobox
                                 }
                             )
                         }
                    ]
                },
                mapColors
            ];

            if (mapLevel==="states" || mapLevel==="world"){
                //formItems.push(mapCenter);
            }

            form = new javaxt.dhtml.Form(body, {
                style: config.style.form,
                items: formItems
            });


          //Update color fields (add colorPicker) and set initial value
            createColorOptions("color", form);
            createColorOptions("backgroundColor", form);
            createColorOptions("landColor", form);
            var pointFill = chartConfig.pointColor || "#ff3c38"; //red default
            form.findField("color").setValue(pointFill);
            form.findField("backgroundColor").setValue(chartConfig.style.backgroundColor);
            form.findField("landColor").setValue(chartConfig.style.landColor);

          //Update color field (add colorPicker) and set initial value
            createColorOptions("outlineColor", form);
            form.findField("outlineColor").setValue(chartConfig.outlineColor || pointFill);

          //Update cutout field (add slider) and set initial value
            createSlider("radius", form, "px", 1, 20, 1);
            var radius = chartConfig.pointRadius;
            if (radius==null) radius = 3;
            chartConfig.pointRadius = radius;
            form.findField("radius").setValue(radius);

            //Create Slider for Opacity
            createSlider("opacity", form, "%");
            var opacity = chartConfig.opacity;
            if (opacity==null) opacity = 100;
            chartConfig.opacity = opacity;
            form.findField("opacity").setValue(opacity);

            //Create Slider for Outline Width
            createSlider("outlineWidth", form, "px", 0, 20, 1);
            var outlineWidth = chartConfig.outlineWidth;
            if (outlineWidth==null) outlineWidth = 0;
            chartConfig.outlineWidth = outlineWidth;
            form.findField("outlineWidth").setValue(outlineWidth);

          //Process onChange events
            if (mapLevel==="states" || mapLevel==="world"){

                var horizontalField = form.findField("centerHorizontal");
                if (horizontalField){
                    var horizontal = chartConfig.lon;
                    if(horizontal==null) {
                        if(mapLevel==="states"){
                            horizontal = 38.7
                        }else{
                            horizontal = 39.5;
                        }
                    }
                    chartConfig.lon = horizontal;
                    horizontalField.setValue(horizontal);
                }

                var verticalField = form.findField("centerVertical");
                if (verticalField){
                    var vertical = chartConfig.lat;
                    if(vertical==null){
                        if(mapLevel==="states"){
                            vertical = -0.6
                        }else{
                            vertical = -98.5;
                        }
                    }
                    chartConfig.lat = vertical;
                    verticalField.setValue(vertical);
                }

                form.onChange = function(){
                    var settings = form.getData();
                    chartConfig.pointColor = settings.color;
                    chartConfig.outlineColor = settings.outlineColor;
                    chartConfig.pointRadius = settings.radius;
                    chartConfig.opacity = settings.opacity;
                    chartConfig.outlineWidth = settings.outlineWidth;
                    chartConfig.style.landColor = settings.landColor;
                    chartConfig.style.backgroundColor = settings.backgroundColor;
                    chartConfig.lon = settings.centerHorizontal;
                    chartConfig.lat = settings.centerVertical;
                    createMapPreview();
                };
            }
            else {

                form.onChange = function(){
                    var settings = form.getData();
                    chartConfig.pointColor = settings.color;
                    chartConfig.outlineColor = settings.outlineColor;
                    chartConfig.style.landColor = settings.landColor;
                    chartConfig.style.backgroundColor = settings.backgroundColor;
                    chartConfig.pointRadius = settings.radius;
                    chartConfig.outlineWidth = settings.outlineWidth;
                    chartConfig.opacity = settings.opacity;
                    createMapPreview();
                };
            }
        }
        else if (mapType==="Area"){
            if (mapLevel==="states" || mapLevel==="world"){

                form = new javaxt.dhtml.Form(body, {
                    style: config.style.form,
                    items: [
                        {
                            group: "Fill Style",
                            items: [
                                {
                                    name: "fillColors",
                                    label: "Color",
                                    type: createColorField()
                                }
                            ]
                        },
                        mapColors
                        //mapCenter
                    ]
                });

                //Set up the Color Picker
                createColorOptions("backgroundColor", form);
                createColorOptions("landColor", form);
                form.findField("backgroundColor").setValue(chartConfig.style.backgroundColor);
                form.findField("landColor").setValue(chartConfig.style.landColor);

                var horizontalField = form.findField("centerHorizontal");
                if (horizontalField){
                    var horizontal = chartConfig.lon;
                    if(horizontal==null) {
                        if(mapLevel==="states"){
                            horizontal = 38.7;
                        }else{
                            horizontal = 39.5;
                        }
                    }
                    chartConfig.lon = horizontal;
                    horizontalField.setValue(horizontal);
                }


                var verticalField = form.findField("centerVertical");
                if (verticalField){
                    var vertical = chartConfig.lat;
                    if(vertical==null){
                        if(mapLevel==="states"){
                            vertical = -0.6;
                        }else{
                            vertical = -98.5;
                        }
                    }
                    chartConfig.lat = vertical;
                    verticalField.setValue(vertical);
                }


              //Process onChange events
                form.onChange = function(){
                    var settings = form.getData();
                    chartConfig.fillColors = JSON.parse(settings.fillColors);
                    chartConfig.style.landColor = settings.landColor;
                    chartConfig.style.backgroundColor = settings.backgroundColor;
                    chartConfig.lon = settings.centerHorizontal;
                    chartConfig.lat = settings.centerVertical;
                    createMapPreview();
                };
            }
            else if (mapLevel==="counties"){


                form = new javaxt.dhtml.Form(body, {
                    style: config.style.form,
                    items: [
                        {
                            group: "Fill Style",
                            items: [
                                {
                                    name: "fillColors",
                                    label: "Color",
                                    type: createColorField()
                                }
                            ]
                        },
                        mapColors
                    ]
                });

                //Set up the Color Picker
                createColorOptions("backgroundColor", form);
                createColorOptions("landColor", form);
                form.findField("backgroundColor").setValue(chartConfig.style.backgroundColor);
                form.findField("landColor").setValue(chartConfig.style.landColor);

                form.onChange = function(){
                    var settings = form.getData();
                    chartConfig.fillColors = JSON.parse(settings.fillColors);
                    chartConfig.style.landColor = settings.landColor;
                    chartConfig.style.backgroundColor = settings.backgroundColor;
                    createMapPreview();
                };
            }
        }
        else if (mapType==="Links"){
            if (mapLevel==="states" || mapLevel==="world"){
                form = new javaxt.dhtml.Form(body, {
                    style: config.style.form,
                    items: [
                        mapColors
                        //mapCenter
                    ]
                });

                //Set up the Color Picker
                createColorOptions("backgroundColor", form);
                createColorOptions("landColor", form);
                form.findField("backgroundColor").setValue(chartConfig.style.backgroundColor);
                form.findField("landColor").setValue(chartConfig.style.landColor);

                var horizontalField = form.findField("centerHorizontal");
                if (horizontalField){
                    var horizontal = chartConfig.lon;
                    if(horizontal==null) {
                        if(mapLevel==="states"){
                            horizontal = 38.7
                        }else{
                            horizontal = 39.5;
                        }
                    }
                    chartConfig.lon = horizontal;
                    horizontalField.setValue(horizontal);
                }

                var verticalField = form.findField("centerVertical");
                if (verticalField){
                    var vertical = chartConfig.lat;
                    if(vertical==null){
                        if(mapLevel==="states"){
                            vertical = -0.6
                        }else{
                            vertical = -98.5;
                        }
                    }
                    chartConfig.lat = vertical;
                    verticalField.setValue(vertical);
                }

                form.onChange = function(){
                    var settings = form.getData();
                    chartConfig.lon =  settings.centerHorizontal;
                    chartConfig.lat = settings.centerVertical;
                    chartConfig.style.landColor = settings.landColor;
                    chartConfig.style.backgroundColor = settings.backgroundColor;
                    createMapPreview();
                };
            }
        }


        if (form){
            styleEditor.showAt(108,57);
            form.resize();
        }
    };


  //**************************************************************************
  //** getMapLevel
  //**************************************************************************
  /** Used to normalize/standardize values for mapLevel
   */
    var getMapLevel = function(chartConfig){
        if (!chartConfig.mapLevel) return null;
        var mapLevel = chartConfig.mapLevel.toLowerCase();
        if (mapLevel.indexOf("census")>-1) return "states";
        if (mapLevel.indexOf("states")>-1) return "states";
        if (mapLevel.indexOf("counties")>-1) return "counties";
        if (mapLevel.indexOf("countries")>-1 || mapLevel.indexOf("world")>-1) return "world";
        return mapLevel;
    };


  //**************************************************************************
  //** createColorField
  //**************************************************************************
  /** Returns a pulldown with color options
   */
    var createColorField = function(){
        var colorField = new javaxt.dhtml.ComboBox(
            document.createElement("div"),
            {
                style: config.style.combobox
            }
        );


      //Add color options
        var defaultValue;
        for (var key in config.colors) {
            if (config.colors.hasOwnProperty(key)){
                colorField.add(key, JSON.stringify(config.colors[key]));
                if (!defaultValue) defaultValue = key;
            }
        }


      //Set initial value for the color
        if (chartConfig.fillColors){
            var color = chartConfig.fillColors;
            colorField.getOptions().every(function(d){
                var key = d.text;
                var val = d.value;
                if (color==key || JSON.stringify(color)==val){
                    colorField.setValue(key);
                    return false;
                }
                return true;
            });
        }
        else{
            colorField.setValue(defaultValue);
        }

        return colorField;
    };


  //**************************************************************************
  //** createColorOptions
  //**************************************************************************
  /** Creates a custom form input using a combobox
   */
    var createColorOptions = function(inputName, form){
        bluewave.utils.createColorOptions(inputName, form, function(colorField){
            if (!colorPicker) colorPicker = bluewave.utils.createColorPickerCallout(config);

            if (inputName==="backgroundColor"){
                colorPicker.setColors([
                    "#fff", //white
                    "#e5ecf4" //blue
                ]);
            }
            else if (inputName==="landColor"){
                colorPicker.setColors([
                    "#f6f8f5", //gray
                    "#dedde0" //gray
                ]);
            }
            else{
                colorPicker.setColors(bluewave.utils.getColorPalette(true));
            }

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
  //** update
  //**************************************************************************
    var update = function(mapChart, data){

      //Clear the map
        mapChart.clear();


      //Set background color for the map (i.e. the color the 'water')
        var backgroundColor = chartConfig.style.backgroundColor;
        if (!backgroundColor) backgroundColor = "white";
        mapChart.setBackgroundColor(backgroundColor);


      //Set default color for land masses
        var landColor = getDefaultFillColor();


      //Get min/max values
        var extent = d3.extent(data, function(d) { return parseFloat(d[chartConfig.mapValue]); });


      //Get fill colors
        var fillColors;
        if(chartConfig.mapType === "Area"){
            fillColors = chartConfig.fillColors;
            if (!fillColors){
                if (config.colors){
                    for (var key in config.colors) {
                        if (config.colors.hasOwnProperty(key)){
                            fillColors = config.colors[key];
                            break;
                        }
                    }
                }
            }
        }



        var mapLevel = chartConfig.mapLevel;
        if (mapLevel === "counties"){

            mapChart.setProjection("AlbersUsa");
            //mapChart.setExtent([-130, 50.5], [-65, 25.8]);


          //Render data
            if (chartConfig.mapType === "Point"){

              //Render counties and states
                renderCounties();
                renderStates();


              //Render points
                var points = {};
                if (chartConfig.pointData==="geoCoords") {
                    points = getPoints(data, chartConfig);
                }
                else if (chartConfig.pointData==="adminArea"){
                    points = getCentroids(data, states);
                }
                renderPoints(points, chartConfig, extent);

            }
            else if(chartConfig.mapType === "Area"){

                var area = selectArea(data, chartConfig);
                if (area==="counties"){
                    renderCounties(data, fillColors, landColor);
                    renderStates();
                }
                else if (area==="states"){ //render states
                    renderStates(data, fillColors, landColor);
                }
                else if (area==="censusDivisions"){ //render census divisions
                    renderCensusRegions(data, fillColors, landColor);
                }
                else{
                    renderCounties();
                    renderStates();
                }
            }

        }
        else if (mapLevel === "states"){

            mapChart.setProjection("Albers");
            //mapChart.setExtent([-130, 50.5], [-65, 25.8]);
            mapChart.setExtent([-130, 40.5], [-65, 25.8]);


          //Render countries
            renderCountries();


          //Render data
            if (chartConfig.mapType === "Point"){

              //Render states
                renderStates();


              //Render points
                var points = {};
                if (chartConfig.pointData==="geoCoords"){
                    points = getPoints(data, chartConfig);
                }
                else if (chartConfig.pointData==="adminArea"){
                    points = getCentroids(data, states);
                }
                renderPoints(points, chartConfig, extent);

            }
            else if(chartConfig.mapType === "Area"){


              //Render data using the most suitable geometry type
                var area = selectArea(data, chartConfig);
                if (area==="counties"){ //render counties
                    renderCounties(data, fillColors, landColor);
                    renderStates();
                }
                else if (area==="states"){ //render states
                    renderStates(data, fillColors, landColor);
                }
                else if (area==="censusDivisions"){ //render census divisions
                    renderCensusRegions(data, fillColors, landColor);
                }
                else{
                    renderStates();
                }

            }
            else if(chartConfig.mapType === "Links"){
                getData("PortsOfEntry", function(ports){
                    mapChart.clear();
                    renderCountries();
                    renderLinks(data, ports);
                });
            }
        }
        else if(mapLevel === "world"){

            mapChart.setProjection("Mercator");
            mapChart.setExtent([-170, 76], [170, -76]);


            if (chartConfig.mapType === "Point"){

              //Render countries
                renderCountries();


              //Render points
                var points = {};
                if (chartConfig.pointData==="geoCoords"){
                    points = getPoints(data, chartConfig);
                }
                else if (chartConfig.pointData==="adminArea"){
                    points = getCentroids(data, countries);
                }
                renderPoints(points, chartConfig, extent);

            }
            else if(chartConfig.mapType === "Area"){

              //Instantiate fill class
                var fill = new Fill(data, fillColors);


              //Render countries
                mapChart.addPolygons(countries.features, {
                    name: "countries",
                    style: {
                        fill: function(feature){
                            return fill.getColor(feature.properties.code, landColor);
                        },
                        stroke: "white"
                    },
                    showTooltip: true,
                    getTooltipLabel: function(feature){
                        var name = feature.properties.name;
                        var value = fill.getValue(feature.properties.code);
                        if (isNaN(value)) value = "No data";
                        return name + ": " + value;
                    }
                });

            }
            else if(chartConfig.mapType === "Links"){
                getData("PortsOfEntry", function(ports){
                    mapChart.clear();
                    renderCountries();
                    renderLinks(data, ports);
                });
            }
        }


        mapChart.update();
        //me.onUpdate();
    };


  //**************************************************************************
  //** renderLinks
  //**************************************************************************
    var renderLinks = function(data, ports){

        var getColor = d3.scaleOrdinal(bluewave.utils.getColorPalette(true));
        var coords = [];
        var quantities = [];
        var countryCodes = {};
        var getCoordinate = function(countryCode, countries){
            for (var i=0; i < countries.features.length; i++){
                var country = countries.features[i].properties;
                if (countryCode === country.code){
                    return [country.longitude, country.latitude];
                }
            }
        };


      //Generate list of coordinates for all the links
        for (var link in data.links){
            if (data.links.hasOwnProperty(link)){
                var arr = link.split('->');
                var n0 = data.nodes[arr[0]];
                var n1 = data.nodes[arr[1]];
                var q = data.links[link].quantity;

                if (n0.country==='US'){
                    coords.push(getCoordinate(n0.state, states));
                }
                else{
                    coords.push(getCoordinate(n0.country, countries));
                }

                if (n0.country !== 'US' && n1.country === 'US'){
                    for (var i = 0; i < ports.length; i++){
                        var port = ports[i];
                        if (n0.country === ports[i].iso2){
                            coords.push([port.exlongitude, port.exlatitude]);
                            coords.push([port.imlongitude, port.imlatitude]);
                            break;
                        }
                    }
                }

                if (n1.country==='US'){
                    coords.push(getCoordinate(n1.state, states));
                }
                else{
                    coords.push(getCoordinate(n1.country, countries));
                }

                quantities.push(q);
                countryCodes[n0.country] = true;
                countryCodes[n1.country] = true;
            }
        }



      //Set map extents
        if (countryCodes['US']){
            countryCodes = Object.keys(countryCodes);
            if (countryCodes.length===1 && countryCodes[0]==="US"){
                mapChart.setExtent([-130, 50.5], [-65, 25.8]); //zoom to US
            }
            else{
                mapChart.setExtent([60, 74], [59, -58]); //zoom to world with US in center
            }
        }
        else{
            mapChart.setExtent([-170, 76], [170, -76]); //zoom to world
        }



      //Add lines
        mapChart.addLines([coords], {
            name: "links",
            style: {
                color: "steelblue",
                opacity: 0.5,
                width: 3
            }
        });


      //Add points
        mapChart.addPoints(coords, {
            name: "nodes",
            style: {
                fill: "#FF0000",
                opacity: 0.5,
                radius: 4
            }
        });


      //Update map
        mapChart.update();
    };


  //**************************************************************************
  //** getPoints
  //**************************************************************************
    var getPoints = function(data, chartConfig){
        var coords = [];
        var hasValue = false;
        data.forEach(function(d){
            var lat = parseFloat(d[chartConfig.latitude]);
            var lon = parseFloat(d[chartConfig.longitude]);
            if (isNaN(lat) || isNaN(lon)) return;
            var coord = [lon, lat];
            if (!coord) return;
            if (isNaN(coord[0]) || isNaN(coord[1])) return;
            var val = parseFloat(d[chartConfig.mapValue]);
            if (!isNaN(val)){
                coord.push(val);
                hasValue = true;
            }
            coords.push(coord);
        });
        return {
            coords: coords,
            hasValue: hasValue
        };
    };


  //**************************************************************************
  //** getCentroids
  //**************************************************************************
    var getCentroids = function(data, mapData){
        var coords = [];
        var hasValue = false;
        data.forEach(function(d){
            var value = d[chartConfig.mapLocation];
            mapData.features.every(function(feature){
                var properties = feature.properties;
                if (value === properties.code){

                  //Get centroid
                    var centroid;
                    if (!isNaN(properties.latitude) && !isNaN(properties.longitude)){
                        centroid = [properties.longitude, properties.latitude];
                    }
                    else{
                        centroid = mapChart.getCentroid(feature);
                    }

                  //Update coords
                    if (centroid){
                        if (isNaN(centroid[0]) || isNaN(centroid[0])) centroid = null;
                        else coords.push(centroid);
                    }

                  //Set value
                    if (centroid && chartConfig.mapValue){
                        var val = parseFloat(d[chartConfig.mapValue]);
                        if (!isNaN(val)){
                            hasValue = true;
                            centroid.push(val);
                        }
                    }

                    return false;
                }
                return true;
            });
        });
        return {
            coords: coords,
            hasValue: hasValue
        };
    };


  //**************************************************************************
  //** renderPoints
  //**************************************************************************
    var renderPoints = function(points, chartConfig, extent){

        var opacity = chartConfig.opacity;
        if(!opacity){
            opacity = 1.0;
        }
        else {
            opacity = opacity/100;
        }


        var r = parseInt(chartConfig.pointRadius);
        if (isNaN(r)) r = 3;
        if (r<0) r = 1;

        var c = chartConfig.pointColor || "#ff3c38"; //red default

        var oc = chartConfig.outlineColor;
        if (!oc) oc = c;


        var outlineWidth = parseFloat(chartConfig.outlineWidth);
        if (isNaN(outlineWidth) || outlineWidth<0) outlineWidth = 0;
        if (outlineWidth>r) outlineWidth = r;


        mapChart.addPoints(points.coords, {
            name: "points",
            style: {
                fill: c,
                opacity: opacity,
                radius: function(coord){
                    if (points.hasValue){
                        var val = coord[2];
                        if (isNaN(val) || val<=0) return r;
                        var p = val/extent[1];
                        var maxSize = r;
                        if (p > 0){
                            return maxSize*p;
                        }
                        else{
                            return maxSize*.25;
                        }
                    }
                    return r;
                },
                outlineWidth: outlineWidth,
                outlineColor: oc
            }
        });
    };


  //**************************************************************************
  //** selectArea
  //**************************************************************************
  /** Returns most suitable map type based on the "mapLocation" config
   */
    var selectArea = function(data, chartConfig){

      //Analyze data
        var numStates = 0;
        var numCounties = 0;
        var numCensusDivisions = 0;
        data.forEach(function(d){
            var location = d[chartConfig.mapLocation];
            if (typeof location === 'undefined') return;
            var censusDivision = getCensusDivision(d[chartConfig.mapLocation]);


            counties.features.every(function(county){
                if (county.id===location){
                    numCounties++;
                    return false;
                }
                return true;
            });

            states.features.every(function(state){
                var foundMatch = false;

                if (state.properties.name===location || state.properties.code===location){
                    numStates++;
                    foundMatch = true;
                }

                if (!isNaN(censusDivision)){
                    if (state.properties.censusDivision===censusDivision){
                        numCensusDivisions++;
                        foundMatch = true;
                    }
                }

                return !foundMatch;
            });

        });


      //Render data using the most suitable geometry type
        var maxMatches = Math.max(numStates, numCounties, numCensusDivisions);
        if (maxMatches>0){
            if (maxMatches===numCounties){
                return "counties";
            }
            else if (maxMatches===numStates){
                return "states";
            }
            else if (maxMatches===numCensusDivisions){
                return "censusDivisions";
            }
        }
        return null;
    };


  //**************************************************************************
  //** renderCounties
  //**************************************************************************
  /** Used to render county polygons
   *  @param data If given, will render different fill colors using data values
   *  @param colorScale Used to define fill colors
   */
    var renderCounties = function(data, fillColors, defaultFillColor){

      //Get default fill color
        if (!defaultFillColor) defaultFillColor = getDefaultFillColor();


      //Instantiate fill class as needed
        var fill;
        if (data && fillColors){
            fill = new Fill(data, fillColors);
        }


      //Add polygons
        mapChart.addPolygons(counties.features, {
            name: "counties",
            style: {
                fill: function(feature){
                    if (fill){
                        return fill.getColor(feature.id, defaultFillColor);
                    }
                    else{
                        return defaultFillColor;
                    }
                },
                stroke: "white"
            },
            showTooltip: fill ? true : false,
            getTooltipLabel: function(feature){
                var name = feature.id;
                var value = fill.getValue(feature.id);
                if (isNaN(value)) value = "No data";
                return name + ": " + value;
            }
        });
    };


  //**************************************************************************
  //** renderStates
  //**************************************************************************
  /** Used to render state polygons
   *  @param data If given, will render different fill colors using data values
   *  @param colorScale Used to define fill colors
   */
    var renderStates = function(data, fillColors, defaultFillColor){

      //Get default fill color
        if (!defaultFillColor) defaultFillColor = getDefaultFillColor();


      //Instantiate fill class as needed
        var fill;
        if (data && fillColors){
            fill = new Fill(data, fillColors);
        }


      //Add polygons
        mapChart.addPolygons(states.features, {
            name: "states",
            style: {
                fill: function(feature){
                    if (fill){
                        var key = feature.properties.name;
                        var value = fill.getValue(key);
                        if (isNaN(value)){
                            key = feature.properties.code;
                            value = fill.getValue(key);
                        }

                        return fill.getColor(key, defaultFillColor);
                    }
                    else{
                        return defaultFillColor;
                    }
                },
                stroke: "white"
            },
            showTooltip: fill ? true : false,
            getTooltipLabel: function(feature){
                var name = feature.properties.name;
                var value = fill.getValue(feature.properties.name);
                if (isNaN(value)) value = "No data";
                return name + ": " + value;
            }
        });
    };


  //**************************************************************************
  //** renderCensusRegions
  //**************************************************************************
  /** Used to render sensus regions using state polygons with a given color scale
   */
    var renderCensusRegions = function(data, fillColors, defaultFillColor){

      //Get default fill color
        if (!defaultFillColor) defaultFillColor = getDefaultFillColor();


      //Instantiate fill class as needed
        var fill;
        if (data && fillColors){
            fill = new Fill(data, fillColors);
        }


        var values = {};
        data.forEach(function(d){
            var censusDivision = getCensusDivision(d[chartConfig.mapLocation]);
            if (!isNaN(censusDivision)){
                values[censusDivision+""] = d[chartConfig.mapValue];
            }
        });

        mapChart.addPolygons(states.features, {
            name: "censusRegions",
            style: {
                fill: function(state){
                    var v = parseFloat(values[state.properties.censusDivision+""]);
                    if (isNaN(v) || v<0) v = 0;
                    var fill = colorScale[chartConfig.colorScale](v);
                    if (!fill) return 'none';
                    return fill;
                },
                stroke: "white"
            },
            showTooltip: fill ? true : false
        });
    };


  //**************************************************************************
  //** renderCountries
  //**************************************************************************
    var renderCountries = function(){
        mapChart.addPolygons(countries.features, {
            name: "countries",
            style: {
                fill: chartConfig.landColor,
                stroke: "white"
            }
        });
    };

  //**************************************************************************
  //** getCensusDivision
  //**************************************************************************
  /** Used to parse a given string and returns an integer value (1-9)
   */
    var getCensusDivision = function(str){

        if (typeof str === 'undefined') return null;
        var censusDivision = parseInt(censusDivision);
        if (!isNaN(censusDivision)) return censusDivision;

        str = str.toLowerCase();
        if (str.indexOf("new england")>-1) return 1;
        if (str.indexOf("middle atlantic")>-1 || str.indexOf("mid atlantic")>-1) return 2;
        if (str.indexOf("east north central")>-1) return 3;
        if (str.indexOf("west north central")>-1) return 4;
        if (str.indexOf("south atlantic")>-1) return 5;
        if (str.indexOf("east south central")>-1) return 6;
        if (str.indexOf("west south central")>-1) return 7;
        if (str.indexOf("mountain")>-1) return 8;
        if (str.indexOf("pacific")>-1) return 9;

        return null;
    };


  //**************************************************************************
  //** getMapData
  //**************************************************************************
  /** Used to get counties, states, and countries (TopoJson data)
   */
    var getMapData = function(callback){
        bluewave.utils.getMapData(function(mapData){
            counties = mapData.counties;
            states = mapData.states;
            countries = mapData.countries;
            callback();
        });
    };


  //**************************************************************************
  //** getData
  //**************************************************************************
    var getData = function(name, callback){
        if (!bluewave.data) bluewave.data = {};
        if (bluewave.data[name]){
            callback.apply(this, [bluewave.data[name]]);
        }
        else{
            bluewave.utils.getData(name, callback);
        }
    };


  //**************************************************************************
  //** getColor
  //**************************************************************************
    var getColor = function(value, colors, breaks){
        for (var i=0; i<breaks.length-1; i++){
            var currBreak = breaks[i];
            var nextBreak = breaks[i+1];
            var color = colors[i];

            if (value>=currBreak && value<nextBreak){
                return color;
            }
            else{
                if (value==breaks[breaks.length-1]){
                    return colors[colors.length-1];
                }
            }
        }
    };


  //**************************************************************************
  //** getDefaultFillColor
  //**************************************************************************
    var getDefaultFillColor = function(){
        var defaultFillColor = chartConfig.style.landColor;
        if (!defaultFillColor) defaultFillColor = "lightgray";
        return defaultFillColor;
    };


  //**************************************************************************
  //** Fill class
  //**************************************************************************
  /** Used to generate fill colors for a given dataset using natural breaks.
   *  @param data A JSON array
   *  @param fillColors An array of strings representing fill colors
   */
    var Fill = function(data, fillColors){
        var me = this;

      //Get values
        var values = {};
        data.forEach(function(d){
            var key = d[chartConfig.mapLocation];
            var value = parseFloat(d[chartConfig.mapValue]);
            if (!isNaN(value)) values[key] = value;
        });


      //Get natural breaks
        var breaks = getNaturalBreaks(Object.values(values), fillColors.length);


        this.getColor = function(key, defaultColor){
            var value = me.getValue(key);
            if (isNaN(value)){
                return defaultColor;
            }
            else{
                return getColor(value, fillColors, breaks);
            }
        };

        this.getValue = function(key){
            return values[key];
        };
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var createTable = javaxt.dhtml.utils.createTable;
    var isArray = javaxt.dhtml.utils.isArray;
    var addShowHide = javaxt.dhtml.utils.addShowHide;

    var createDashboardItem = bluewave.utils.createDashboardItem;
    var addTextEditor = bluewave.utils.addTextEditor;
    var createSlider = bluewave.utils.createSlider;

    var getType = bluewave.chart.utils.getType;
    var getNaturalBreaks = bluewave.chart.utils.getNaturalBreaks;


    init();
 };