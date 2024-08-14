if(!bluewave) var bluewave={};
bluewave.utils = {


  //**************************************************************************
  //** get
  //**************************************************************************
  /** Used to execute http GET requests and generate json from the response
   */
    get: function(url, config){
        var payload = null;
        if (arguments.length>2){
            payload = arguments[1];
            config = arguments[2];
        }

        var get = javaxt.dhtml.utils.get;

        get(url,{
            payload: payload,
            success: function(response){
                var s = response.substring(0,1);
                if (s=="{" || s=="["){
                    var json = JSON.parse(response);
                    if (json.cols && json.rows){ //conflate response

                        var rows = json.rows;
                        var cols = {};
                        for (var i=0; i<json.cols.length; i++){
                            cols[json.cols[i]] = i;
                        }
                        for (var i=0; i<rows.length; i++){
                            var row = rows[i];
                            var obj = {};
                            for (var col in cols) {
                                if (cols.hasOwnProperty(col)){
                                    obj[col] = row[cols[col]];
                                }
                            }
                            rows[i] = obj;
                        }

                        json = rows;
                    }
                    response = json;
                }
                if (config.success) config.success.apply(this, [response]);
            },
            failure: function(request){
                if (config.failure) config.failure.apply(this, [request]);
            }
        });
    },


  //**************************************************************************
  //** getData
  //**************************************************************************
  /** Used to get data from the "data/" service url. If running standalone,
   *  returns static json data from the "data" directory in the web folder.
   *  If reunning as a service, returns data from the REST endpoint.
   */
    getData: function(name, path, callback){
        if (!bluewave.data) bluewave.data = {};


      //Update args if needed for backward compatibility
        if (arguments.length>1){
            if (typeof arguments[1] === 'function') {
                callback = arguments[1];
                path = "data/";
            }
        }


      //Update path as needed
        var idx = path.lastIndexOf("/");
        if (idx!==path.length-1){
            path += "/";
        }


        var url = path + name;
        var get = javaxt.dhtml.utils.get;
        var update = function(json){
            if (callback) callback.apply(this, [json]);
        };

        get(url,{
            success: function(text){
                if (text.indexOf("{")==0 || text.indexOf("[")==0){
                    update(JSON.parse(text));
                }
                else{
                    update(text);
                }
            },
            failure: function(){
                var idx = name.indexOf("?");
                if (idx>-1) name = name.substring(0, idx);

              //Load static file
                if (bluewave.data[name]){
                    update(bluewave.data[name]);
                }
                else{
                    var script = document.createElement("script");
                    script.setAttribute("type", "text/javascript");
                    script.setAttribute("src", url+".js?_=" + new Date().getTime());
                    script.onload = function() {
                        update(bluewave.data[name]);
                    };
                    var head = document.getElementsByTagName("head")[0];
                    head.appendChild(script);
                }
            }
        });
    },


  //**************************************************************************
  //** getMapData
  //**************************************************************************
  /** Used to get counties, states, and countries (TopoJson data)
   */
    getMapData: function(path, callback){
        if (arguments.length===0) return;

      //Update args if needed for backward compatibility
        if (typeof arguments[0] === 'function') {
            callback = arguments[0];
            path = "data/";
        }


        var getData = bluewave.utils.getData;
        if (!bluewave.data) bluewave.data = {};
        if (!bluewave.data.mapData) bluewave.data.mapData = {};
        var counties = bluewave.data.mapData.counties;
        var countries = bluewave.data.mapData.countries;

        if (counties){
            if (countries) callback.apply(this, [bluewave.data.mapData]);
            else{
                getData("countries", path, function(countryData){
                    countries = topojson.feature(countryData, countryData.objects.countries);
                    bluewave.data.mapData.countries = countries;

                    callback.apply(this, [bluewave.data.mapData]);
                });
            }
        }
        else{
            getData("counties", path, function(countyData){

                counties = topojson.feature(countyData, countyData.objects.counties);
                bluewave.data.mapData.counties = counties;

                var states = topojson.feature(countyData, countyData.objects.states);
                bluewave.data.mapData.states = states;

                if (countries) callback.apply(this, [bluewave.data.mapData]);
                else{
                    getData("countries", path, function(countryData){
                        countries = topojson.feature(countryData, countryData.objects.countries);
                        bluewave.data.mapData.countries = countries;

                        callback.apply(this, [bluewave.data.mapData]);
                    });
                }
            });
        }
    },


  //**************************************************************************
  //** warn
  //**************************************************************************
  /** Used to display a warning/error message over a given form field.
   */
    warn: function(msg, field){
        var tr = field.row;
        var td;
        if (tr){
            td = tr.childNodes[2];
        }else{
            td = field.el.parentNode;
        }
        if(td == null){
            td = field.el.parentNode;
        }
        var getRect = javaxt.dhtml.utils.getRect;
        var rect = getRect(td);

        var inputs = td.getElementsByTagName("input");
        if (inputs.length==0) inputs = td.getElementsByTagName("textarea");
        if (inputs.length>0){
            inputs[0].blur();
            var cls = "form-input-error";
            if (inputs[0].className){
                if (inputs[0].className.indexOf(cls)==-1) inputs[0].className += " " + cls;
            }
            else{
                inputs[0].className = cls;
            }
            rect = getRect(inputs[0]);
            field.resetColor = function(){
                if (inputs[0].className){
                    inputs[0].className = inputs[0].className.replace(cls,"");
                }
            };
        }

        var callout = bluewave.utils.formError;
        if (!callout){
            callout = new javaxt.dhtml.Callout(document.body,{
                style:{
                    panel: "error-callout-panel",
                    arrow: "error-callout-arrow"
                }
            });
            bluewave.utils.formError = callout;
        }

        callout.getInnerDiv().innerHTML = msg;

        var x = rect.x + (rect.width/2);
        var y = rect.y;
        callout.showAt(x, y, "above", "center");
    },


  //**************************************************************************
  //** createButton
  //**************************************************************************
    createButton: function(toolbar, btn){

        btn = JSON.parse(JSON.stringify(btn));

        if (btn.icon){
            btn.style.icon = "toolbar-button-icon " + btn.icon;
            delete btn.icon;
        }


        if (btn.menu===true){
            btn.style.arrow = "toolbar-button-menu-icon";
            btn.style.menu = "menu-panel";
            btn.style.select = "panel-toolbar-menubutton-selected";
        }

        return new javaxt.dhtml.Button(toolbar, btn);
    },


  //**************************************************************************
  //** createSpacer
  //**************************************************************************
    createSpacer: function(toolbar){
        javaxt.dhtml.utils.createElement("div", toolbar, "toolbar-spacer");
    },


  //**************************************************************************
  //** createToggleButton
  //**************************************************************************
    createToggleButton: function(parent, config){
        var createElement = javaxt.dhtml.utils.createElement;

      //Set default config options
        var defaultConfig = {
            style: {
                panel: "toggle-button-bar noselect",
                button: "toggle-button",
                activeButton: "toggle-button-active"
            }
        };


      //Merge config with default config
        javaxt.dhtml.utils.merge(config, defaultConfig);


        var div = createElement("div", parent, config.style.panel);


        var onClick = function(btn, silent){
            if (btn.className===config.style.activeButton) return;
            div.reset();
            btn.className=config.style.activeButton;
            if (silent===true) return;
            if (config.onChange) config.onChange.apply(btn, [btn.innerHTML]);
        };

        for (var i=0; i<config.options.length; i++){
            var btn = createElement("div", div, config.style.button);
            btn.innerHTML = config.options[i];
            btn.onclick = function(){
                onClick(this);
            };
        }

        div.setValue = function(val, silent){
            for (var i=0; i<div.childNodes.length; i++){
                var btn = div.childNodes[i];
                if (btn.innerText===val){
                    onClick(btn);
                    break;
                }
            }
        };

        div.getValue = function(){
            for (var i=0; i<div.childNodes.length; i++){
                var btn = div.childNodes[i];
                if (btn.className===config.style.activeButton){
                    return btn.innerText;
                }
            }
            return null;
        };

        div.reset = function(){
            for (var i=0; i<div.childNodes.length; i++){
                div.childNodes[i].className = config.style.button;
            }
        };

        return div;
    },


  //**************************************************************************
  //** createDashboardItem
  //**************************************************************************
    createDashboardItem: function(parent, config){
        var createElement = javaxt.dhtml.utils.createElement;


      //Set default config options
        var defaultConfig = {
            width: 360,
            height: 260,
            title: "",
            subtitle: "",
            settings: false,
            waitmask: false
        };


      //Merge config with default config
        javaxt.dhtml.utils.merge(config, defaultConfig);

        var width = config.width+"";
        var height = config.height+"";
        if (width.indexOf("%")===-1) width = parseInt(width) + "px";
        if (height.indexOf("%")===-1) height = parseInt(height) + "px";



        var div = createElement("div", parent, "dashboard-item");
        div.style.width = width;
        div.style.height = height;
        div.style.position = "relative";


        var settings;
        if (config.settings===true){
            settings = createElement("div", div, "dashboard-item-settings noselect");
            settings.innerHTML = '<i class="fas fa-cog"></i>';
        }


        var table = javaxt.dhtml.utils.createTable(div);

        var title = table.addRow().addColumn("chart-title noselect");
        title.innerHTML = config.title;

        var subtitle = table.addRow().addColumn("chart-subtitle noselect");
        subtitle.innerHTML = config.subtitle;


        var innerDiv = table.addRow().addColumn();
        innerDiv.style.height = "100%";
        innerDiv.style.position = "relative";


        var waitmask;
        if (config.waitmask){
            waitmask = new javaxt.express.WaitMask(div);
        }

        return {
            el: div,
            title: title,
            subtitle: subtitle,
            innerDiv: innerDiv,
            settings: settings,
            waitmask: waitmask
        };
    },


  //**************************************************************************
  //** createGrid
  //**************************************************************************
    createGrid: function(records, hasHeader, gridContainer, config){
        gridContainer.innerHTML = "";


      //Set column config
        var columnConfig = [];
        var w = javaxt.dhtml.utils.getSuggestedColumnWidths(records, 10);
        var columns = records[0];
        for (var i=0; i<columns.length; i++){

          //Get suggested column width
            var columnWidth = w.suggestedWidths[i];
            var minWidth = null;
            if (columnWidth==="100%" && columns.length>1){
                minWidth = Math.min(w.widths[i], 175);
            }

          //Update column config
            columnConfig.push({
               header: hasHeader ? columns[i] : (i+1),
               width: columnWidth,
               minWidth: minWidth,
               sortable: false
            });
        }


      //Create overflow divs
        var outerDiv = document.createElement("div");
        outerDiv.style.height = "100%";
        outerDiv.style.position = "relative";
        gridContainer.appendChild(outerDiv);

        var innerDiv = document.createElement("div");
        innerDiv.style.width = "100%";
        innerDiv.style.height = "100%";
        innerDiv.style.position = "absolute";
        innerDiv.style.overflow = "hidden";
        innerDiv.style.overflowX = "auto";
        outerDiv.appendChild(innerDiv);

        var overflowDiv = document.createElement("div");
        overflowDiv.style.width = "100%";
        overflowDiv.style.height = "100%";
        overflowDiv.style.position = "absolute";
        innerDiv.appendChild(overflowDiv);

        var headerWidth = w.headerWidth;
        javaxt.dhtml.utils.onRender(innerDiv, function(){
            var rect = javaxt.dhtml.utils.getRect(innerDiv);
            if (rect.width<headerWidth){
                overflowDiv.style.width = headerWidth + "px";
            }
        });


      //Create grid
        var grid = new javaxt.dhtml.DataGrid(overflowDiv, {
            columns: columnConfig,
            style: config.style.table,
            getResponse: function(url, payload, callback){
                callback.apply(grid, [{ status: 0 }]);
            }
        });


      //Create function to get records by page
        var page = 1;
        var startRow = hasHeader ? 1 : 0;
        var getData = function(page){
            var limit = 50;
            var offset = 0;
            if (page>1) offset = ((page-1)*limit)+1;

            var data = [];
            for (var i=startRow+offset; i<records.length; i++){
                data.push(records[i]);
                if (data.length===limit) break;
            }
            return data;
        };


      //Load first page of data
        grid.load(getData(page), page);


      //Watch for scroll events to load more data
        var pages = {};
        pages[page+''] = true;
        grid.onPageChange = function(currPage){
            page = currPage;

            if (!pages[page+'']){
                grid.load(getData(page), page);
                pages[page+''] = true;
            }
        };

        return grid;
    },


  //**************************************************************************
  //** createEditor
  //**************************************************************************
  /** Used to create an editor with two panels. The left panel is used to
   *  identify input data and the main panel contains the corresponding chart.
   */
    createEditor: function(parent, config){
        var createTable = javaxt.dhtml.utils.createTable;
        var createElement = javaxt.dhtml.utils.createElement;
        var addResizeListener = javaxt.dhtml.utils.addResizeListener;
        var addTextEditor = bluewave.utils.addTextEditor;
        var createDashboardItem = bluewave.utils.createDashboardItem;


        if (!config) config = {
            onResize: function(){},
            onTitleChange: function(){},
            onSettings: function(){}
        };


        let table = createTable(parent);
        var tr = table.addRow();
        var td;


      //Create chart options
        td = tr.addColumn();
        td.style.height = "100%";
        var outerDiv = createElement("div", td, "chart-editor-options");
        outerDiv.style.height = "100%";
        outerDiv.style.position = "relative";
        outerDiv.style.overflow = "hidden";
        outerDiv.style.overflowY = "auto";

        var optionsDiv = createElement("div", outerDiv);
        optionsDiv.style.position = "absolute";


      //Create chart preview
        td = tr.addColumn("chart-editor-preview");
        td.style.width = "100%";
        td.style.height = "100%";

        var timer;
        addResizeListener(td, function(){
            if (timer) clearTimeout(timer);
            timer = setTimeout(()=>{
                config.onResize();
            },800);
        });

        var outerDiv = createElement("div", td);
        outerDiv.style.height = "100%";
        outerDiv.style.position = "relative";
        outerDiv.style.overflow = "hidden";

        var panel = createDashboardItem(outerDiv,{
            width: "100%",
            height: "100%",
            title: "Untitled",
            settings: true
        });
        panel.el.className = "";
        panel.el.style.position = "absolute";


      //Allow users to change the title associated with the chart
        addTextEditor(panel.title, function(title){
            panel.title.innerHTML = title;
            config.onTitleChange(title);
        });


      //Watch for settings
        panel.settings.onclick = function(){
            config.onSettings();
        };

        return {
            el: table,
            getTitle: function(){
                return panel.title.innerHTML;
            },
            setTitle: function(title){
                panel.title.innerHTML = title;
            },
            getLeftPanel: function(){
                return optionsDiv;
            },
            getChartArea: function(){
                return panel.innerDiv;
            },
            clear: function(){
                panel.title.innerHTML = "Untitled";
                optionsDiv.innerHTML = "";
                panel.innerDiv.innerHTML = "";
            }
        };
    },


  //**************************************************************************
  //** addTextEditor
  //**************************************************************************
    addTextEditor: function(div, callback){
        var setTitle = function(title){
            if (callback) callback.apply(div,[title]);
        };

        div.onclick = function(e){
            if (this.childNodes[0].nodeType===1) return;
            e.stopPropagation();
            var currText = this.innerText;
            this.innerHTML = "";
            var input = document.createElement("input");
            input.className = "form-input";
            input.type = "text";
            input.value = currText;
            input.onkeydown = function(event){
                var key = event.keyCode;
                if (key === 9 || key === 13) {
                    setTitle(this.value);
                }
            };
            this.appendChild(input);
            input.focus();
        };

        document.body.addEventListener('click', function(e) {
            var input = div.childNodes[0];
            var className = e.target.className;
            if (input.nodeType === 1 && className != "form-input") {
                setTitle(input.value);
            };
        });
    },


  //**************************************************************************
  //** createSlider
  //**************************************************************************
  /** Creates a custom form input using a text field
   */
    createSlider: function(inputName, form, endCharacter = "", min=0, max=100, interval=5){

      //Add row under the given input
        var input = form.findField(inputName);
        var row = input.row.cloneNode(true);
        var cols = row.childNodes;
        for (var i=0; i<cols.length; i++){
            cols[i].innerHTML = "";
        }
        input.row.parentNode.insertBefore(row, input.row.nextSibling);
        row.style.height = "20px";


      //Add slider to the last column of the new row
        var slider = document.createElement("input");
        cols[2].appendChild(slider);
        slider.type = "range";
        slider.className = "dashboard-slider";
        min = parseInt(min);
        if (min<0) min = 0;
        max = parseInt(max);
        if (max<min) max = 100;

        interval = parseInt(interval);
        if (interval<1) interval = 1;
        max = Math.ceil(max/interval);

        slider.setAttribute("min", min+1);
        slider.setAttribute("max", max+1);
        slider.onchange = function(){
            var val = (this.value-1)*interval;
            input.setValue(val);
        };

        var isNumber = javaxt.dhtml.utils.isNumber;
        var round = javaxt.dhtml.utils.round;


        var setValue = input.setValue;
        input.setValue = function(val){
            val = parseFloat(val);
            setValue(val + `${endCharacter}`);
            slider.value = round(val/interval)+1;
        };

        var getValue = input.getValue;
        input.getValue = function(){
            var val = parseFloat(getValue());
            if (isNumber(val)) return round(val, 0);
            else return 0;
        };

        input.row.getElementsByTagName("input")[0].addEventListener('input', function(e) {
            var val = parseFloat(this.value);
            if (isNumber(val)){
                if (val<0) val = 0;
                //if (val>=94) val = 100;

                input.setValue(val);
            }
        });

        return slider;
    },


  //**************************************************************************
  //** createColorOptions
  //**************************************************************************
  /** Creates a custom form input using a combobox
   */
    createColorOptions: function(inputName, form, onClick){

        var colorField = form.findField(inputName);
        var colorPreview = colorField.getButton();
        colorPreview.className = colorPreview.className.replace("pulldown-button-icon", "");
        colorPreview.style.boxShadow = "none";
        colorPreview.setColor = function(color){
            colorPreview.style.backgroundColor = color;
            //colorPreview.style.borderColor = color;
        };
        colorField.setValue = function(color){
            //color = getHexColor(getColor(color));
            colorPreview.setColor(color);
            colorField.getInput().value = color;
            form.onChange(colorField, color);
        };
        colorField.getValue = function(){
            return colorField.getInput().value;
        };
        colorPreview.onclick = function(){
            if (onClick) onClick.apply(this,[colorField]);
        };
    },


  //**************************************************************************
  //** formatNumber
  //**************************************************************************
  /** Adds commas and ensures that there are a maximum of 2 decimals if the
   *  number has decimals
   */
    formatNumber: function(x){
        if (x==null) return "";
        if (typeof x !== "string") x+="";
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    },


  //**************************************************************************
  //** getStyleEditor
  //**************************************************************************
    getStyleEditor : function(config){
        if (!bluewave.utils.styleEditor){
            bluewave.utils.styleEditor = new javaxt.dhtml.Window(document.body, {
                title: "Edit Style",
                width: 400,
                valign: "top",
                modal: false,
                resizable: false,
                style: config.style.window
            });
        }
        return bluewave.utils.styleEditor;
    },


  //**************************************************************************
  //** getColorPalette
  //**************************************************************************
    getColorPalette: function(fixedColors){
        if (fixedColors===true)
        return [

          //darker
            "#6699CC", //blue
            "#98DFAF", //green
            "#FF3C38", //red
            "#FF8C42", //orange
            "#933ed5", //purple
            "#bebcc1", //gray

          //lighter
            "#9DBEDE",
            "#C6EDD3",
            "#FF8280",
            "#FFB586",
            "#cda5eb",
            "#dedde0"
        ];


        return [
            ...[
              "#C6EDD3",
              "#98DFAF",
              "#FF8280",
              "#FF3C38",
              "#FFB586",
              "#FF8C42",
              "#9DBEDE",
              "#6699CC",
              "#999999"
            ],
            ...d3.schemeCategory10
        ];

    },


  //**************************************************************************
  //** getThemeColors
  //**************************************************************************
  /** Returns a JSON object with a list of colors where the key is a color
   *  name and the corresponing value is a hex color.
   */
    getThemeColors: function(){
        return {
            blue:   "#6699CC",
            green:  "#98DFAF",
            red:    "#FF3C38",
            orange: "#FF8C42",
            purple: "#933ed5",
            grey:   "#bebcc1"
        };
    },


  //**************************************************************************
  //** getColorGradients
  //**************************************************************************
  /** Returns a JSON object with a list of color palettes where the key is a
   *  palette name and the corresponing value is an array of hex colors.
   */
    getColorGradients: function(){

        var gradients = {};

      //Add default theme colors
        var colors = bluewave.utils.getThemeColors();
        for (var key in colors) {
            if (colors.hasOwnProperty(key)){
                if (key=="grey") continue;
                var color = colors[key];
                //color = chroma(color).darken().hex();


                var arr = [];
                var colorRange = chroma.scale([color, "#f8f8f8"]);
                for (var i=0; i<=7; i++){
                    var p = javaxt.dhtml.utils.round((i/7), 2);
                    var c = colorRange(p).hex();
                    arr.push(c);
                }
                gradients[key] = arr;

                /*
                gradients[key] = [color, "#f8f8f8"];

                if (key=='blue') gradients.blue = d3.schemeBlues[7].reverse();
                if (key=='red') gradients.red = d3.schemeReds[7].reverse();
                if (key=='green') gradients.green = d3.schemeGreens[7].reverse();
                if (key=='grey') gradients.grey = d3.schemeGreys[7].reverse();
                if (key=='purple') gradients.purple = d3.schemePurples[7].reverse();
                */
            }
        }


      //Add D3 colors
        var inferno = [];
        var plasma = [];
        for (var i=0; i<=10; i++){
            var x = i/10;
            inferno.push(d3.interpolateInferno(x));
            plasma.push(d3.interpolatePlasma(x));
        }
        gradients.inferno = inferno.reverse();
        gradients.plasma = plasma.reverse();

        gradients.mixed = Object.values(colors);
        gradients.d3 = d3.schemeCategory10;
        gradients.tableau = d3.schemeTableau10;


      //Add colors from coolors.co
        var arr = [{"#606C38":"rgb(96, 108, 56)","#283618":"rgb(40, 54, 24)","#FEFAE0":"rgb(254, 250, 224)","#DDA15E":"rgb(221, 161, 94)","#BC6C25":"rgb(188, 108, 37)"},{"#CDB4DB":"rgb(205, 180, 219)","#FFC8DD":"rgb(255, 200, 221)","#FFAFCC":"rgb(255, 175, 204)","#BDE0FE":"rgb(189, 224, 254)","#A2D2FF":"rgb(162, 210, 255)"},{"#CCD5AE":"rgb(204, 213, 174)","#E9EDC9":"rgb(233, 237, 201)","#FEFAE0":"rgb(254, 250, 224)","#FAEDCD":"rgb(250, 237, 205)","#D4A373":"rgb(212, 163, 115)"},{"#8ECAE6":"rgb(142, 202, 230)","#219EBC":"rgb(33, 158, 188)","#023047":"rgb(2, 48, 71)","#FFB703":"rgb(255, 183, 3)","#FB8500":"rgb(251, 133, 0)"},{"#780000":"rgb(120, 0, 0)","#C1121F":"rgb(193, 18, 31)","#FDF0D5":"rgb(253, 240, 213)","#003049":"rgb(0, 48, 73)","#669BBC":"rgb(102, 155, 188)"},{"#003049":"rgb(0, 48, 73)","#D62828":"rgb(214, 40, 40)","#F77F00":"rgb(247, 127, 0)","#FCBF49":"rgb(252, 191, 73)","#EAE2B7":"rgb(234, 226, 183)"},{"#264653":"rgb(38, 70, 83)","#2A9D8F":"rgb(42, 157, 143)","#E9C46A":"rgb(233, 196, 106)","#F4A261":"rgb(244, 162, 97)","#E76F51":"rgb(231, 111, 81)"},{"#EDEDE9":"rgb(237, 237, 233)","#D6CCC2":"rgb(214, 204, 194)","#F5EBE0":"rgb(245, 235, 224)","#E3D5CA":"rgb(227, 213, 202)","#D5BDAF":"rgb(213, 189, 175)"},{"#0081A7":"rgb(0, 129, 167)","#00AFB9":"rgb(0, 175, 185)","#FDFCDC":"rgb(253, 252, 220)","#FED9B7":"rgb(254, 217, 183)","#F07167":"rgb(240, 113, 103)"},{"#000000":"rgb(0, 0, 0)","#14213D":"rgb(20, 33, 61)","#FCA311":"rgb(252, 163, 17)","#E5E5E5":"rgb(229, 229, 229)","#FFFFFF":"rgb(255, 255, 255)"},{"#582F0E":"rgb(88, 47, 14)","#7F4F24":"rgb(127, 79, 36)","#936639":"rgb(147, 102, 57)","#A68A64":"rgb(166, 138, 100)","#B6AD90":"rgb(182, 173, 144)","#C2C5AA":"rgb(194, 197, 170)","#A4AC86":"rgb(164, 172, 134)","#656D4A":"rgb(101, 109, 74)","#414833":"rgb(65, 72, 51)","#333D29":"rgb(51, 61, 41)"},{"#03045E":"rgb(3, 4, 94)","#0077B6":"rgb(0, 119, 182)","#00B4D8":"rgb(0, 180, 216)","#90E0EF":"rgb(144, 224, 239)","#CAF0F8":"rgb(202, 240, 248)"},{"#03045E":"rgb(3, 4, 94)","#023E8A":"rgb(2, 62, 138)","#0077B6":"rgb(0, 119, 182)","#0096C7":"rgb(0, 150, 199)","#00B4D8":"rgb(0, 180, 216)","#48CAE4":"rgb(72, 202, 228)","#90E0EF":"rgb(144, 224, 239)","#ADE8F4":"rgb(173, 232, 244)","#CAF0F8":"rgb(202, 240, 248)"},{"#E63946":"rgb(230, 57, 70)","#F1FAEE":"rgb(241, 250, 238)","#A8DADC":"rgb(168, 218, 220)","#457B9D":"rgb(69, 123, 157)","#1D3557":"rgb(29, 53, 87)"},{"#F6BD60":"rgb(246, 189, 96)","#F7EDE2":"rgb(247, 237, 226)","#F5CAC3":"rgb(245, 202, 195)","#84A59D":"rgb(132, 165, 157)","#F28482":"rgb(242, 132, 130)"},{"#FFE5EC":"rgb(255, 229, 236)","#FFC2D1":"rgb(255, 194, 209)","#FFB3C6":"rgb(255, 179, 198)","#FF8FAB":"rgb(255, 143, 171)","#FB6F92":"rgb(251, 111, 146)"},{"#DAD7CD":"rgb(218, 215, 205)","#A3B18A":"rgb(163, 177, 138)","#588157":"rgb(88, 129, 87)","#3A5A40":"rgb(58, 90, 64)","#344E41":"rgb(52, 78, 65)"},{"#2B2D42":"rgb(43, 45, 66)","#8D99AE":"rgb(141, 153, 174)","#EDF2F4":"rgb(237, 242, 244)","#EF233C":"rgb(239, 35, 60)","#D90429":"rgb(217, 4, 41)"},{"#000814":"rgb(0, 8, 20)","#001D3D":"rgb(0, 29, 61)","#003566":"rgb(0, 53, 102)","#FFC300":"rgb(255, 195, 0)","#FFD60A":"rgb(255, 214, 10)"},{"#0D1B2A":"rgb(13, 27, 42)","#1B263B":"rgb(27, 38, 59)","#415A77":"rgb(65, 90, 119)","#778DA9":"rgb(119, 141, 169)","#E0E1DD":"rgb(224, 225, 221)"},{"#03071E":"rgb(3, 7, 30)","#370617":"rgb(55, 6, 23)","#6A040F":"rgb(106, 4, 15)","#9D0208":"rgb(157, 2, 8)","#D00000":"rgb(208, 0, 0)","#DC2F02":"rgb(220, 47, 2)","#E85D04":"rgb(232, 93, 4)","#F48C06":"rgb(244, 140, 6)","#FAA307":"rgb(250, 163, 7)","#FFBA08":"rgb(255, 186, 8)"},{"#FFFCF2":"rgb(255, 252, 242)","#CCC5B9":"rgb(204, 197, 185)","#403D39":"rgb(64, 61, 57)","#252422":"rgb(37, 36, 34)","#EB5E28":"rgb(235, 94, 40)"},{"#FFBE0B":"rgb(255, 190, 11)","#FB5607":"rgb(251, 86, 7)","#FF006E":"rgb(255, 0, 110)","#8338EC":"rgb(131, 56, 236)","#3A86FF":"rgb(58, 134, 255)"},{"#FFCDB2":"rgb(255, 205, 178)","#FFB4A2":"rgb(255, 180, 162)","#E5989B":"rgb(229, 152, 155)","#B5838D":"rgb(181, 131, 141)","#6D6875":"rgb(109, 104, 117)"},{"#16697A":"rgb(22, 105, 122)","#489FB5":"rgb(72, 159, 181)","#82C0CC":"rgb(130, 192, 204)","#EDE7E3":"rgb(237, 231, 227)","#FFA62B":"rgb(255, 166, 43)"},{"#F0EAD2":"rgb(240, 234, 210)","#DDE5B6":"rgb(221, 229, 182)","#ADC178":"rgb(173, 193, 120)","#A98467":"rgb(169, 132, 103)","#6C584C":"rgb(108, 88, 76)"},{"#F72585":"rgb(247, 37, 133)","#7209B7":"rgb(114, 9, 183)","#3A0CA3":"rgb(58, 12, 163)","#4361EE":"rgb(67, 97, 238)","#4CC9F0":"rgb(76, 201, 240)"},{"#E7ECEF":"rgb(231, 236, 239)","#274C77":"rgb(39, 76, 119)","#6096BA":"rgb(96, 150, 186)","#A3CEF1":"rgb(163, 206, 241)","#8B8C89":"rgb(139, 140, 137)"},{"#D8E2DC":"rgb(216, 226, 220)","#FFE5D9":"rgb(255, 229, 217)","#FFCAD4":"rgb(255, 202, 212)","#F4ACB7":"rgb(244, 172, 183)","#9D8189":"rgb(157, 129, 137)"},{"#FFD6FF":"rgb(255, 214, 255)","#E7C6FF":"rgb(231, 198, 255)","#C8B6FF":"rgb(200, 182, 255)","#B8C0FF":"rgb(184, 192, 255)","#BBD0FF":"rgb(187, 208, 255)"},{"#EF476F":"rgb(239, 71, 111)","#FFD166":"rgb(255, 209, 102)","#06D6A0":"rgb(6, 214, 160)","#118AB2":"rgb(17, 138, 178)","#073B4C":"rgb(7, 59, 76)"},{"#880D1E":"rgb(136, 13, 30)","#DD2D4A":"rgb(221, 45, 74)","#F26A8D":"rgb(242, 106, 141)","#F49CBB":"rgb(244, 156, 187)","#CBEEF3":"rgb(203, 238, 243)"},{"#05668D":"rgb(5, 102, 141)","#028090":"rgb(2, 128, 144)","#00A896":"rgb(0, 168, 150)","#02C39A":"rgb(2, 195, 154)","#F0F3BD":"rgb(240, 243, 189)"},{"#FBF8CC":"rgb(251, 248, 204)","#FDE4CF":"rgb(253, 228, 207)","#FFCFD2":"rgb(255, 207, 210)","#F1C0E8":"rgb(241, 192, 232)","#CFBAF0":"rgb(207, 186, 240)","#A3C4F3":"rgb(163, 196, 243)","#90DBF4":"rgb(144, 219, 244)","#8EECF5":"rgb(142, 236, 245)","#98F5E1":"rgb(152, 245, 225)","#B9FBC0":"rgb(185, 251, 192)"},{"#F8F9FA":"rgb(248, 249, 250)","#E9ECEF":"rgb(233, 236, 239)","#DEE2E6":"rgb(222, 226, 230)","#CED4DA":"rgb(206, 212, 218)","#ADB5BD":"rgb(173, 181, 189)","#6C757D":"rgb(108, 117, 125)","#495057":"rgb(73, 80, 87)","#343A40":"rgb(52, 58, 64)","#212529":"rgb(33, 37, 41)"},{"#6F1D1B":"rgb(111, 29, 27)","#BB9457":"rgb(187, 148, 87)","#432818":"rgb(67, 40, 24)","#99582A":"rgb(153, 88, 42)","#FFE6A7":"rgb(255, 230, 167)"},{"#00296B":"rgb(0, 41, 107)","#003F88":"rgb(0, 63, 136)","#00509D":"rgb(0, 80, 157)","#FDC500":"rgb(253, 197, 0)","#FFD500":"rgb(255, 213, 0)"},{"#006D77":"rgb(0, 109, 119)","#83C5BE":"rgb(131, 197, 190)","#EDF6F9":"rgb(237, 246, 249)","#FFDDD2":"rgb(255, 221, 210)","#E29578":"rgb(226, 149, 120)"},{"#FF9F1C":"rgb(255, 159, 28)","#FFBF69":"rgb(255, 191, 105)","#FFFFFF":"rgb(255, 255, 255)","#CBF3F0":"rgb(203, 243, 240)","#2EC4B6":"rgb(46, 196, 182)"},{"#F4F1DE":"rgb(244, 241, 222)","#E07A5F":"rgb(224, 122, 95)","#3D405B":"rgb(61, 64, 91)","#81B29A":"rgb(129, 178, 154)","#F2CC8F":"rgb(242, 204, 143)"},{"#132A13":"rgb(19, 42, 19)","#31572C":"rgb(49, 87, 44)","#4F772D":"rgb(79, 119, 45)","#90A955":"rgb(144, 169, 85)","#ECF39E":"rgb(236, 243, 158)"},{"#335C67":"rgb(51, 92, 103)","#FFF3B0":"rgb(255, 243, 176)","#E09F3E":"rgb(224, 159, 62)","#9E2A2B":"rgb(158, 42, 43)","#540B0E":"rgb(84, 11, 14)"},{"#0D1321":"rgb(13, 19, 33)","#1D2D44":"rgb(29, 45, 68)","#3E5C76":"rgb(62, 92, 118)","#748CAB":"rgb(116, 140, 171)","#F0EBD8":"rgb(240, 235, 216)"},{"#EDAFB8":"rgb(237, 175, 184)","#F7E1D7":"rgb(247, 225, 215)","#DEDBD2":"rgb(222, 219, 210)","#B0C4B1":"rgb(176, 196, 177)","#4A5759":"rgb(74, 87, 89)"},{"#22223B":"rgb(34, 34, 59)","#4A4E69":"rgb(74, 78, 105)","#9A8C98":"rgb(154, 140, 152)","#C9ADA7":"rgb(201, 173, 167)","#F2E9E4":"rgb(242, 233, 228)"},{"#FF99C8":"rgb(255, 153, 200)","#FCF6BD":"rgb(252, 246, 189)","#D0F4DE":"rgb(208, 244, 222)","#A9DEF9":"rgb(169, 222, 249)","#E4C1F9":"rgb(228, 193, 249)"},{"#001219":"rgb(0, 18, 25)","#005F73":"rgb(0, 95, 115)","#0A9396":"rgb(10, 147, 150)","#94D2BD":"rgb(148, 210, 189)","#E9D8A6":"rgb(233, 216, 166)","#EE9B00":"rgb(238, 155, 0)","#CA6702":"rgb(202, 103, 2)","#BB3E03":"rgb(187, 62, 3)","#AE2012":"rgb(174, 32, 18)","#9B2226":"rgb(155, 34, 38)"},{"#F7B267":"rgb(247, 178, 103)","#F79D65":"rgb(247, 157, 101)","#F4845F":"rgb(244, 132, 95)","#F27059":"rgb(242, 112, 89)","#F25C54":"rgb(242, 92, 84)"},{"#5F0F40":"rgb(95, 15, 64)","#9A031E":"rgb(154, 3, 30)","#FB8B24":"rgb(251, 139, 36)","#E36414":"rgb(227, 100, 20)","#0F4C5C":"rgb(15, 76, 92)"},{"#FF7B00":"rgb(255, 123, 0)","#FF8800":"rgb(255, 136, 0)","#FF9500":"rgb(255, 149, 0)","#FFA200":"rgb(255, 162, 0)","#FFAA00":"rgb(255, 170, 0)","#FFB700":"rgb(255, 183, 0)","#FFC300":"rgb(255, 195, 0)","#FFD000":"rgb(255, 208, 0)","#FFDD00":"rgb(255, 221, 0)","#FFEA00":"rgb(255, 234, 0)"},{"#33A8C7":"rgb(51, 168, 199)","#52E3E1":"rgb(82, 227, 225)","#A0E426":"rgb(160, 228, 38)","#FDF148":"rgb(253, 241, 72)","#FFAB00":"rgb(255, 171, 0)","#F77976":"rgb(247, 121, 118)","#F050AE":"rgb(240, 80, 174)","#D883FF":"rgb(216, 131, 255)","#9336FD":"rgb(147, 54, 253)"},{"#F94144":"rgb(249, 65, 68)","#F3722C":"rgb(243, 114, 44)","#F8961E":"rgb(248, 150, 30)","#F9844A":"rgb(249, 132, 74)","#F9C74F":"rgb(249, 199, 79)","#90BE6D":"rgb(144, 190, 109)","#43AA8B":"rgb(67, 170, 139)","#4D908E":"rgb(77, 144, 142)","#577590":"rgb(87, 117, 144)","#277DA1":"rgb(39, 125, 161)"},{"#10002B":"rgb(16, 0, 43)","#240046":"rgb(36, 0, 70)","#3C096C":"rgb(60, 9, 108)","#5A189A":"rgb(90, 24, 154)","#7B2CBF":"rgb(123, 44, 191)","#9D4EDD":"rgb(157, 78, 221)","#C77DFF":"rgb(199, 125, 255)","#E0AAFF":"rgb(224, 170, 255)"},{"#2C6E49":"rgb(44, 110, 73)","#4C956C":"rgb(76, 149, 108)","#FEFEE3":"rgb(254, 254, 227)","#FFC9B9":"rgb(255, 201, 185)","#D68C45":"rgb(214, 140, 69)"},{"#565264":"rgb(86, 82, 100)","#706677":"rgb(112, 102, 119)","#A6808C":"rgb(166, 128, 140)","#CCB7AE":"rgb(204, 183, 174)","#D6CFCB":"rgb(214, 207, 203)"},{"#9B5DE5":"rgb(155, 93, 229)","#F15BB5":"rgb(241, 91, 181)","#FEE440":"rgb(254, 228, 64)","#00BBF9":"rgb(0, 187, 249)","#00F5D4":"rgb(0, 245, 212)"},{"#5BC0EB":"rgb(91, 192, 235)","#FDE74C":"rgb(253, 231, 76)","#9BC53D":"rgb(155, 197, 61)","#C3423F":"rgb(195, 66, 63)","#211A1E":"rgb(33, 26, 30)"},{"#3D5A80":"rgb(61, 90, 128)","#98C1D9":"rgb(152, 193, 217)","#E0FBFC":"rgb(224, 251, 252)","#EE6C4D":"rgb(238, 108, 77)","#293241":"rgb(41, 50, 65)"},{"#FFAC81":"rgb(255, 172, 129)","#FF928B":"rgb(255, 146, 139)","#FEC3A6":"rgb(254, 195, 166)","#EFE9AE":"rgb(239, 233, 174)","#CDEAC0":"rgb(205, 234, 192)"},{"#F72585":"rgb(247, 37, 133)","#B5179E":"rgb(181, 23, 158)","#7209B7":"rgb(114, 9, 183)","#560BAD":"rgb(86, 11, 173)","#480CA8":"rgb(72, 12, 168)","#3A0CA3":"rgb(58, 12, 163)","#3F37C9":"rgb(63, 55, 201)","#4361EE":"rgb(67, 97, 238)","#4895EF":"rgb(72, 149, 239)","#4CC9F0":"rgb(76, 201, 240)"},{"#22577A":"rgb(34, 87, 122)","#38A3A5":"rgb(56, 163, 165)","#57CC99":"rgb(87, 204, 153)","#80ED99":"rgb(128, 237, 153)","#C7F9CC":"rgb(199, 249, 204)"},{"#D8E2DC":"rgb(216, 226, 220)","#FFFFFF":"rgb(255, 255, 255)","#FFCAD4":"rgb(255, 202, 212)","#F4ACB7":"rgb(244, 172, 183)","#9D8189":"rgb(157, 129, 137)"},{"#2F4858":"rgb(47, 72, 88)","#33658A":"rgb(51, 101, 138)","#86BBD8":"rgb(134, 187, 216)","#F6AE2D":"rgb(246, 174, 45)","#F26419":"rgb(242, 100, 25)"},{"#D81159":"rgb(216, 17, 89)","#8F2D56":"rgb(143, 45, 86)","#218380":"rgb(33, 131, 128)","#FBB13C":"rgb(251, 177, 60)","#73D2DE":"rgb(115, 210, 222)"},{"#6B9080":"rgb(107, 144, 128)","#A4C3B2":"rgb(164, 195, 178)","#CCE3DE":"rgb(204, 227, 222)","#EAF4F4":"rgb(234, 244, 244)","#F6FFF8":"rgb(246, 255, 248)"},{"#9A756F":"rgb(154, 117, 111)","#D2ABA4":"rgb(210, 171, 164)","#EDCFC7":"rgb(237, 207, 199)","#AEC2A9":"rgb(174, 194, 169)","#5D785E":"rgb(93, 120, 94)"},{"#004B23":"rgb(0, 75, 35)","#006400":"rgb(0, 100, 0)","#007200":"rgb(0, 114, 0)","#008000":"rgb(0, 128, 0)","#38B000":"rgb(56, 176, 0)","#70E000":"rgb(112, 224, 0)","#9EF01A":"rgb(158, 240, 26)","#CCFF33":"rgb(204, 255, 51)"},{"#355070":"rgb(53, 80, 112)","#6D597A":"rgb(109, 89, 122)","#B56576":"rgb(181, 101, 118)","#E56B6F":"rgb(229, 107, 111)","#EAAC8B":"rgb(234, 172, 139)"},{"#0A0908":"rgb(10, 9, 8)","#49111C":"rgb(73, 17, 28)","#F2F4F3":"rgb(242, 244, 243)","#A9927D":"rgb(169, 146, 125)","#5E503F":"rgb(94, 80, 63)"},{"#70D6FF":"rgb(112, 214, 255)","#FF70A6":"rgb(255, 112, 166)","#FF9770":"rgb(255, 151, 112)","#FFD670":"rgb(255, 214, 112)","#E9FF70":"rgb(233, 255, 112)"},{"#FFFFFF":"rgb(255, 255, 255)","#FFCAD4":"rgb(255, 202, 212)","#B0D0D3":"rgb(176, 208, 211)","#C08497":"rgb(192, 132, 151)","#F7AF9D":"rgb(247, 175, 157)"},{"#EEC643":"rgb(238, 198, 67)","#141414":"rgb(20, 20, 20)","#EEF0F2":"rgb(238, 240, 242)","#0D21A1":"rgb(13, 33, 161)","#011638":"rgb(1, 22, 56)"},{"#001427":"rgb(0, 20, 39)","#708D81":"rgb(112, 141, 129)","#F4D58D":"rgb(244, 213, 141)","#BF0603":"rgb(191, 6, 3)","#8D0801":"rgb(141, 8, 1)"},{"#F5E3E0":"rgb(245, 227, 224)","#E8B4BC":"rgb(232, 180, 188)","#D282A6":"rgb(210, 130, 166)","#6E4555":"rgb(110, 69, 85)","#3A3238":"rgb(58, 50, 56)"},{"#007F5F":"rgb(0, 127, 95)","#2B9348":"rgb(43, 147, 72)","#55A630":"rgb(85, 166, 48)","#80B918":"rgb(128, 185, 24)","#AACC00":"rgb(170, 204, 0)","#BFD200":"rgb(191, 210, 0)","#D4D700":"rgb(212, 215, 0)","#DDDF00":"rgb(221, 223, 0)","#EEEF20":"rgb(238, 239, 32)","#FFFF3F":"rgb(255, 255, 63)"},{"#A8D5E2":"rgb(168, 213, 226)","#F9A620":"rgb(249, 166, 32)","#FFD449":"rgb(255, 212, 73)","#548C2F":"rgb(84, 140, 47)","#104911":"rgb(16, 73, 17)"},{"#386641":"rgb(56, 102, 65)","#6A994E":"rgb(106, 153, 78)","#A7C957":"rgb(167, 201, 87)","#F2E8CF":"rgb(242, 232, 207)","#BC4749":"rgb(188, 71, 73)"},{"#F8FFE5":"rgb(248, 255, 229)","#06D6A0":"rgb(6, 214, 160)","#1B9AAA":"rgb(27, 154, 170)","#EF476F":"rgb(239, 71, 111)","#FFC43D":"rgb(255, 196, 61)"},{"#390099":"rgb(57, 0, 153)","#9E0059":"rgb(158, 0, 89)","#FF0054":"rgb(255, 0, 84)","#FF5400":"rgb(255, 84, 0)","#FFBD00":"rgb(255, 189, 0)"},{"#BEE9E8":"rgb(190, 233, 232)","#62B6CB":"rgb(98, 182, 203)","#1B4965":"rgb(27, 73, 101)","#CAE9FF":"rgb(202, 233, 255)","#5FA8D3":"rgb(95, 168, 211)"},{"#3D348B":"rgb(61, 52, 139)","#7678ED":"rgb(118, 120, 237)","#F7B801":"rgb(247, 184, 1)","#F18701":"rgb(241, 135, 1)","#F35B04":"rgb(243, 91, 4)"},{"#461220":"rgb(70, 18, 32)","#8C2F39":"rgb(140, 47, 57)","#B23A48":"rgb(178, 58, 72)","#FCB9B2":"rgb(252, 185, 178)","#FED0BB":"rgb(254, 208, 187)"},{"#0A100D":"rgb(10, 16, 13)","#B9BAA3":"rgb(185, 186, 163)","#D6D5C9":"rgb(214, 213, 201)","#A22C29":"rgb(162, 44, 41)","#902923":"rgb(144, 41, 35)"},{"#ECC8AF":"rgb(236, 200, 175)","#E7AD99":"rgb(231, 173, 153)","#CE796B":"rgb(206, 121, 107)","#C18C5D":"rgb(193, 140, 93)","#495867":"rgb(73, 88, 103)"},{"#201E43":"rgb(32, 30, 67)","#134B70":"rgb(19, 75, 112)","#508C9B":"rgb(80, 140, 155)","#EEEEEE":"rgb(238, 238, 238)","#AF7595":"rgb(175, 117, 149)"},{"#012A4A":"rgb(1, 42, 74)","#013A63":"rgb(1, 58, 99)","#01497C":"rgb(1, 73, 124)","#014F86":"rgb(1, 79, 134)","#2A6F97":"rgb(42, 111, 151)","#2C7DA0":"rgb(44, 125, 160)","#468FAF":"rgb(70, 143, 175)","#61A5C2":"rgb(97, 165, 194)","#89C2D9":"rgb(137, 194, 217)","#A9D6E5":"rgb(169, 214, 229)"},{"#7400B8":"rgb(116, 0, 184)","#6930C3":"rgb(105, 48, 195)","#5E60CE":"rgb(94, 96, 206)","#5390D9":"rgb(83, 144, 217)","#4EA8DE":"rgb(78, 168, 222)","#48BFE3":"rgb(72, 191, 227)","#56CFE1":"rgb(86, 207, 225)","#64DFDF":"rgb(100, 223, 223)","#72EFDD":"rgb(114, 239, 221)","#80FFDB":"rgb(128, 255, 219)"},{"#FFCBF2":"rgb(255, 203, 242)","#F3C4FB":"rgb(243, 196, 251)","#ECBCFD":"rgb(236, 188, 253)","#E5B3FE":"rgb(229, 179, 254)","#E2AFFF":"rgb(226, 175, 255)","#DEAAFF":"rgb(222, 170, 255)","#D8BBFF":"rgb(216, 187, 255)","#D0D1FF":"rgb(208, 209, 255)","#C8E7FF":"rgb(200, 231, 255)","#C0FDFF":"rgb(192, 253, 255)"},{"#FFB5A7":"rgb(255, 181, 167)","#FCD5CE":"rgb(252, 213, 206)","#F8EDEB":"rgb(248, 237, 235)","#F9DCC4":"rgb(249, 220, 196)","#FEC89A":"rgb(254, 200, 154)"},{"#7C6A0A":"rgb(124, 106, 10)","#BABD8D":"rgb(186, 189, 141)","#FFDAC6":"rgb(255, 218, 198)","#FA9500":"rgb(250, 149, 0)","#EB6424":"rgb(235, 100, 36)"},{"#F08080":"rgb(240, 128, 128)","#F4978E":"rgb(244, 151, 142)","#F8AD9D":"rgb(248, 173, 157)","#FBC4AB":"rgb(251, 196, 171)","#FFDAB9":"rgb(255, 218, 185)"},{"#D88C9A":"rgb(216, 140, 154)","#F2D0A9":"rgb(242, 208, 169)","#F1E3D3":"rgb(241, 227, 211)","#99C1B9":"rgb(153, 193, 185)","#8E7DBE":"rgb(142, 125, 190)"},{"#0A2463":"rgb(10, 36, 99)","#3E92CC":"rgb(62, 146, 204)","#FFFAFF":"rgb(255, 250, 255)","#D8315B":"rgb(216, 49, 91)","#1E1B18":"rgb(30, 27, 24)"},{"#0D3B66":"rgb(13, 59, 102)","#FAF0CA":"rgb(250, 240, 202)","#F4D35E":"rgb(244, 211, 94)","#EE964B":"rgb(238, 150, 75)","#F95738":"rgb(249, 87, 56)"},{"#780116":"rgb(120, 1, 22)","#F7B538":"rgb(247, 181, 56)","#DB7C26":"rgb(219, 124, 38)","#D8572A":"rgb(216, 87, 42)","#C32F27":"rgb(195, 47, 39)"},{"#96BBBB":"rgb(150, 187, 187)","#618985":"rgb(97, 137, 133)","#414535":"rgb(65, 69, 53)","#F2E3BC":"rgb(242, 227, 188)","#C19875":"rgb(193, 152, 117)"},{"#A1CCA5":"rgb(161, 204, 165)","#8FB996":"rgb(143, 185, 150)","#709775":"rgb(112, 151, 117)","#415D43":"rgb(65, 93, 67)","#111D13":"rgb(17, 29, 19)"},{"#CAD2C5":"rgb(202, 210, 197)","#84A98C":"rgb(132, 169, 140)","#52796F":"rgb(82, 121, 111)","#354F52":"rgb(53, 79, 82)","#2F3E46":"rgb(47, 62, 70)"},{"#590D22":"rgb(89, 13, 34)","#800F2F":"rgb(128, 15, 47)","#A4133C":"rgb(164, 19, 60)","#C9184A":"rgb(201, 24, 74)","#FF4D6D":"rgb(255, 77, 109)","#FF758F":"rgb(255, 117, 143)","#FF8FA3":"rgb(255, 143, 163)","#FFB3C1":"rgb(255, 179, 193)","#FFCCD5":"rgb(255, 204, 213)","#FFF0F3":"rgb(255, 240, 243)"},{"#EA698B":"rgb(234, 105, 139)","#D55D92":"rgb(213, 93, 146)","#C05299":"rgb(192, 82, 153)","#AC46A1":"rgb(172, 70, 161)","#973AA8":"rgb(151, 58, 168)","#822FAF":"rgb(130, 47, 175)","#6D23B6":"rgb(109, 35, 182)","#6411AD":"rgb(100, 17, 173)","#571089":"rgb(87, 16, 137)","#47126B":"rgb(71, 18, 107)"},{"#FFEDD8":"rgb(255, 237, 216)","#F3D5B5":"rgb(243, 213, 181)","#E7BC91":"rgb(231, 188, 145)","#D4A276":"rgb(212, 162, 118)","#BC8A5F":"rgb(188, 138, 95)","#A47148":"rgb(164, 113, 72)","#8B5E34":"rgb(139, 94, 52)","#6F4518":"rgb(111, 69, 24)","#603808":"rgb(96, 56, 8)","#583101":"rgb(88, 49, 1)"},{"#FF0000":"rgb(255, 0, 0)","#FF8700":"rgb(255, 135, 0)","#FFD300":"rgb(255, 211, 0)","#DEFF0A":"rgb(222, 255, 10)","#A1FF0A":"rgb(161, 255, 10)","#0AFF99":"rgb(10, 255, 153)","#0AEFFF":"rgb(10, 239, 255)","#147DF5":"rgb(20, 125, 245)","#580AFF":"rgb(88, 10, 255)","#BE0AFF":"rgb(190, 10, 255)"},{"#EDF2FB":"rgb(237, 242, 251)","#E2EAFC":"rgb(226, 234, 252)","#D7E3FC":"rgb(215, 227, 252)","#CCDBFD":"rgb(204, 219, 253)","#C1D3FE":"rgb(193, 211, 254)","#B6CCFE":"rgb(182, 204, 254)","#ABC4FF":"rgb(171, 196, 255)"},{"#D8F3DC":"rgb(216, 243, 220)","#B7E4C7":"rgb(183, 228, 199)","#95D5B2":"rgb(149, 213, 178)","#74C69D":"rgb(116, 198, 157)","#52B788":"rgb(82, 183, 136)","#40916C":"rgb(64, 145, 108)","#2D6A4F":"rgb(45, 106, 79)","#1B4332":"rgb(27, 67, 50)","#081C15":"rgb(8, 28, 21)"},{"#FFADAD":"rgb(255, 173, 173)","#FFD6A5":"rgb(255, 214, 165)","#FDFFB6":"rgb(253, 255, 182)","#CAFFBF":"rgb(202, 255, 191)","#9BF6FF":"rgb(155, 246, 255)","#A0C4FF":"rgb(160, 196, 255)","#BDB2FF":"rgb(189, 178, 255)","#FFC6FF":"rgb(255, 198, 255)","#FFFFFC":"rgb(255, 255, 252)"},{"#2D00F7":"rgb(45, 0, 247)","#6A00F4":"rgb(106, 0, 244)","#8900F2":"rgb(137, 0, 242)","#A100F2":"rgb(161, 0, 242)","#B100E8":"rgb(177, 0, 232)","#BC00DD":"rgb(188, 0, 221)","#D100D1":"rgb(209, 0, 209)","#DB00B6":"rgb(219, 0, 182)","#E500A4":"rgb(229, 0, 164)","#F20089":"rgb(242, 0, 137)"},{"#001524":"rgb(0, 21, 36)","#15616D":"rgb(21, 97, 109)","#FFECD1":"rgb(255, 236, 209)","#FF7D00":"rgb(255, 125, 0)","#78290F":"rgb(120, 41, 15)"},{"#292F36":"rgb(41, 47, 54)","#4ECDC4":"rgb(78, 205, 196)","#F7FFF7":"rgb(247, 255, 247)","#FF6B6B":"rgb(255, 107, 107)","#FFE66D":"rgb(255, 230, 109)"},{"#080708":"rgb(8, 7, 8)","#3772FF":"rgb(55, 114, 255)","#DF2935":"rgb(223, 41, 53)","#FDCA40":"rgb(253, 202, 64)","#E6E8E6":"rgb(230, 232, 230)"},{"#1C1C1C":"rgb(28, 28, 28)","#DADDD8":"rgb(218, 221, 216)","#ECEBE4":"rgb(236, 235, 228)","#EEF0F2":"rgb(238, 240, 242)","#FAFAFF":"rgb(250, 250, 255)"},{"#74D3AE":"rgb(116, 211, 174)","#678D58":"rgb(103, 141, 88)","#A6C48A":"rgb(166, 196, 138)","#F6E7CB":"rgb(246, 231, 203)","#DD9787":"rgb(221, 151, 135)"},{"#1A1423":"rgb(26, 20, 35)","#3D314A":"rgb(61, 49, 74)","#684756":"rgb(104, 71, 86)","#96705B":"rgb(150, 112, 91)","#AB8476":"rgb(171, 132, 118)"},{"#FAA275":"rgb(250, 162, 117)","#FF8C61":"rgb(255, 140, 97)","#CE6A85":"rgb(206, 106, 133)","#985277":"rgb(152, 82, 119)","#5C374C":"rgb(92, 55, 76)"},{"#97DFFC":"rgb(151, 223, 252)","#858AE3":"rgb(133, 138, 227)","#613DC1":"rgb(97, 61, 193)","#4E148C":"rgb(78, 20, 140)","#2C0735":"rgb(44, 7, 53)"},{"#9C89B8":"rgb(156, 137, 184)","#F0A6CA":"rgb(240, 166, 202)","#EFC3E6":"rgb(239, 195, 230)","#F0E6EF":"rgb(240, 230, 239)","#B8BEDD":"rgb(184, 190, 221)"},{"#EDEEC9":"rgb(237, 238, 201)","#DDE7C7":"rgb(221, 231, 199)","#BFD8BD":"rgb(191, 216, 189)","#98C9A3":"rgb(152, 201, 163)","#77BFA3":"rgb(119, 191, 163)"},{"#001B2E":"rgb(0, 27, 46)","#457B9D":"rgb(69, 123, 157)","#FEFAE0":"rgb(254, 250, 224)","#FAEDCD":"rgb(250, 237, 205)","#D4A373":"rgb(212, 163, 115)"},{"#C0DBEC":"rgb(192, 219, 236)","#FECFD5":"rgb(254, 207, 213)","#FCECC1":"rgb(252, 236, 193)","#A7D9BD":"rgb(167, 217, 189)","#FFF8F4":"rgb(255, 248, 244)"},{"#8D7664":"rgb(141, 118, 100)","#CCC5BE":"rgb(204, 197, 190)","#004558":"rgb(0, 69, 88)","#F1E5D4":"rgb(241, 229, 212)","#FFFFFF":"rgb(255, 255, 255)"},{"#FF0A54":"rgb(255, 10, 84)","#FF477E":"rgb(255, 71, 126)","#FF5C8A":"rgb(255, 92, 138)","#FF7096":"rgb(255, 112, 150)","#FF85A1":"rgb(255, 133, 161)","#FF99AC":"rgb(255, 153, 172)","#FBB1BD":"rgb(251, 177, 189)","#F9BEC7":"rgb(249, 190, 199)","#F7CAD0":"rgb(247, 202, 208)","#FAE0E4":"rgb(250, 224, 228)"},{"#EDE0D4":"rgb(237, 224, 212)","#E6CCB2":"rgb(230, 204, 178)","#DDB892":"rgb(221, 184, 146)","#B08968":"rgb(176, 137, 104)","#7F5539":"rgb(127, 85, 57)","#9C6644":"rgb(156, 102, 68)"},{"#FF6D00":"rgb(255, 109, 0)","#FF7900":"rgb(255, 121, 0)","#FF8500":"rgb(255, 133, 0)","#FF9100":"rgb(255, 145, 0)","#FF9E00":"rgb(255, 158, 0)","#240046":"rgb(36, 0, 70)","#3C096C":"rgb(60, 9, 108)","#5A189A":"rgb(90, 24, 154)","#7B2CBF":"rgb(123, 44, 191)","#9D4EDD":"rgb(157, 78, 221)"},{"#0B090A":"rgb(11, 9, 10)","#161A1D":"rgb(22, 26, 29)","#660708":"rgb(102, 7, 8)","#A4161A":"rgb(164, 22, 26)","#BA181B":"rgb(186, 24, 27)","#E5383B":"rgb(229, 56, 59)","#B1A7A6":"rgb(177, 167, 166)","#D3D3D3":"rgb(211, 211, 211)","#F5F3F4":"rgb(245, 243, 244)","#FFFFFF":"rgb(255, 255, 255)"},{"#FFADAD":"rgb(255, 173, 173)","#FFD6A5":"rgb(255, 214, 165)","#FDFFB6":"rgb(253, 255, 182)","#CAFFBF":"rgb(202, 255, 191)","#9BF6FF":"rgb(155, 246, 255)","#A0C4FF":"rgb(160, 196, 255)","#BDB2FF":"rgb(189, 178, 255)","#FFC6FF":"rgb(255, 198, 255)"},{"#27187E":"rgb(39, 24, 126)","#758BFD":"rgb(117, 139, 253)","#AEB8FE":"rgb(174, 184, 254)","#F1F2F6":"rgb(241, 242, 246)","#FF8600":"rgb(255, 134, 0)"},{"#5AA9E6":"rgb(90, 169, 230)","#7FC8F8":"rgb(127, 200, 248)","#F9F9F9":"rgb(249, 249, 249)","#FFE45E":"rgb(255, 228, 94)","#FF6392":"rgb(255, 99, 146)"},{"#000000":"rgb(0, 0, 0)","#FFFFFC":"rgb(255, 255, 252)","#BEB7A4":"rgb(190, 183, 164)","#FF7F11":"rgb(255, 127, 17)","#FF3F00":"rgb(255, 63, 0)"},{"#FFFFFF":"rgb(255, 255, 255)","#FFE8D1":"rgb(255, 232, 209)","#568EA3":"rgb(86, 142, 163)","#68C3D4":"rgb(104, 195, 212)","#826251":"rgb(130, 98, 81)"},{"#D00000":"rgb(208, 0, 0)","#FFBA08":"rgb(255, 186, 8)","#3F88C5":"rgb(63, 136, 197)","#032B43":"rgb(3, 43, 67)","#136F63":"rgb(19, 111, 99)"},{"#2D3142":"rgb(45, 49, 66)","#BFC0C0":"rgb(191, 192, 192)","#FFFFFF":"rgb(255, 255, 255)","#EF8354":"rgb(239, 131, 84)","#4F5D75":"rgb(79, 93, 117)"},{"#353535":"rgb(53, 53, 53)","#3C6E71":"rgb(60, 110, 113)","#FFFFFF":"rgb(255, 255, 255)","#D9D9D9":"rgb(217, 217, 217)","#284B63":"rgb(40, 75, 99)"},{"#FFFEFF":"rgb(255, 254, 255)","#FF01FB":"rgb(255, 1, 251)","#02A9EA":"rgb(2, 169, 234)","#FAFF00":"rgb(250, 255, 0)","#000300":"rgb(0, 3, 0)"},{"#04151F":"rgb(4, 21, 31)","#183A37":"rgb(24, 58, 55)","#EFD6AC":"rgb(239, 214, 172)","#C44900":"rgb(196, 73, 0)","#432534":"rgb(67, 37, 52)"},{"#2F6690":"rgb(47, 102, 144)","#3A7CA5":"rgb(58, 124, 165)","#D9DCD6":"rgb(217, 220, 214)","#16425B":"rgb(22, 66, 91)","#81C3D7":"rgb(129, 195, 215)"},{"#9E0031":"rgb(158, 0, 49)","#8E0045":"rgb(142, 0, 69)","#770058":"rgb(119, 0, 88)","#600047":"rgb(96, 0, 71)","#44001A":"rgb(68, 0, 26)"},{"#FFEDE1":"rgb(255, 237, 225)","#F9FBF2":"rgb(249, 251, 242)","#D7F9FF":"rgb(215, 249, 255)","#AFCBFF":"rgb(175, 203, 255)","#0E1C36":"rgb(14, 28, 54)"},{"#FDC5F5":"rgb(253, 197, 245)","#F7AEF8":"rgb(247, 174, 248)","#B388EB":"rgb(179, 136, 235)","#8093F1":"rgb(128, 147, 241)","#72DDF7":"rgb(114, 221, 247)"},{"#4F6D7A":"rgb(79, 109, 122)","#C0D6DF":"rgb(192, 214, 223)","#DBE9EE":"rgb(219, 233, 238)","#4A6FA5":"rgb(74, 111, 165)","#166088":"rgb(22, 96, 136)"},{"#463F3A":"rgb(70, 63, 58)","#8A817C":"rgb(138, 129, 124)","#BCB8B1":"rgb(188, 184, 177)","#F4F3EE":"rgb(244, 243, 238)","#E0AFA0":"rgb(224, 175, 160)"},{"#521936":"rgb(82, 25, 54)","#59226D":"rgb(89, 34, 109)","#224A6D":"rgb(34, 74, 109)","#9C3066":"rgb(156, 48, 102)","#C3603C":"rgb(195, 96, 60)"},{"#D9ED92":"rgb(217, 237, 146)","#B5E48C":"rgb(181, 228, 140)","#99D98C":"rgb(153, 217, 140)","#76C893":"rgb(118, 200, 147)","#52B69A":"rgb(82, 182, 154)","#34A0A4":"rgb(52, 160, 164)","#168AAD":"rgb(22, 138, 173)","#1A759F":"rgb(26, 117, 159)","#1E6091":"rgb(30, 96, 145)","#184E77":"rgb(24, 78, 119)"},{"#CB997E":"rgb(203, 153, 126)","#DDBEA9":"rgb(221, 190, 169)","#FFE8D6":"rgb(255, 232, 214)","#B7B7A4":"rgb(183, 183, 164)","#A5A58D":"rgb(165, 165, 141)","#6B705C":"rgb(107, 112, 92)"},{"#EDDCD2":"rgb(237, 220, 210)","#FFF1E6":"rgb(255, 241, 230)","#FDE2E4":"rgb(253, 226, 228)","#FAD2E1":"rgb(250, 210, 225)","#C5DEDD":"rgb(197, 222, 221)","#DBE7E4":"rgb(219, 231, 228)","#F0EFEB":"rgb(240, 239, 235)","#D6E2E9":"rgb(214, 226, 233)","#BCD4E6":"rgb(188, 212, 230)","#99C1DE":"rgb(153, 193, 222)"},{"#FFE169":"rgb(255, 225, 105)","#FAD643":"rgb(250, 214, 67)","#EDC531":"rgb(237, 197, 49)","#DBB42C":"rgb(219, 180, 44)","#C9A227":"rgb(201, 162, 39)","#B69121":"rgb(182, 145, 33)","#A47E1B":"rgb(164, 126, 27)","#926C15":"rgb(146, 108, 21)","#805B10":"rgb(128, 91, 16)","#76520E":"rgb(118, 82, 14)"},{"#5465FF":"rgb(84, 101, 255)","#788BFF":"rgb(120, 139, 255)","#9BB1FF":"rgb(155, 177, 255)","#BFD7FF":"rgb(191, 215, 255)","#E2FDFF":"rgb(226, 253, 255)"},{"#05668D":"rgb(5, 102, 141)","#427AA1":"rgb(66, 122, 161)","#EBF2FA":"rgb(235, 242, 250)","#679436":"rgb(103, 148, 54)","#A5BE00":"rgb(165, 190, 0)"},{"#AD343E":"rgb(173, 52, 62)","#474747":"rgb(71, 71, 71)","#F2AF29":"rgb(242, 175, 41)","#000000":"rgb(0, 0, 0)","#E0E0CE":"rgb(224, 224, 206)"},{"#0A0908":"rgb(10, 9, 8)","#22333B":"rgb(34, 51, 59)","#EAE0D5":"rgb(234, 224, 213)","#C6AC8F":"rgb(198, 172, 143)","#5E503F":"rgb(94, 80, 63)"},{"#0FA3B1":"rgb(15, 163, 177)","#B5E2FA":"rgb(181, 226, 250)","#F9F7F3":"rgb(249, 247, 243)","#EDDEA4":"rgb(237, 222, 164)","#F7A072":"rgb(247, 160, 114)"},{"#36151E":"rgb(54, 21, 30)","#593F62":"rgb(89, 63, 98)","#7B6D8D":"rgb(123, 109, 141)","#8499B1":"rgb(132, 153, 177)","#A5C4D4":"rgb(165, 196, 212)"},{"#250902":"rgb(37, 9, 2)","#38040E":"rgb(56, 4, 14)","#640D14":"rgb(100, 13, 20)","#800E13":"rgb(128, 14, 19)","#AD2831":"rgb(173, 40, 49)"},{"#D72638":"rgb(215, 38, 56)","#3F88C5":"rgb(63, 136, 197)","#F49D37":"rgb(244, 157, 55)","#140F2D":"rgb(20, 15, 45)","#F22B29":"rgb(242, 43, 41)"},{"#ABC4AB":"rgb(171, 196, 171)","#A39171":"rgb(163, 145, 113)","#DCC9B6":"rgb(220, 201, 182)","#727D71":"rgb(114, 125, 113)","#6D4C3D":"rgb(109, 76, 61)"},{"#C33C54":"rgb(195, 60, 84)","#254E70":"rgb(37, 78, 112)","#37718E":"rgb(55, 113, 142)","#8EE3EF":"rgb(142, 227, 239)","#AEF3E7":"rgb(174, 243, 231)"},{"#083D77":"rgb(8, 61, 119)","#EBEBD3":"rgb(235, 235, 211)","#F4D35E":"rgb(244, 211, 94)","#EE964B":"rgb(238, 150, 75)","#F95738":"rgb(249, 87, 56)"},{"#EEE2DF":"rgb(238, 226, 223)","#EED7C5":"rgb(238, 215, 197)","#C89F9C":"rgb(200, 159, 156)","#C97C5D":"rgb(201, 124, 93)","#B36A5E":"rgb(179, 106, 94)"},{"#AF2BBF":"rgb(175, 43, 191)","#A14EBF":"rgb(161, 78, 191)","#6C91BF":"rgb(108, 145, 191)","#5FB0B7":"rgb(95, 176, 183)","#5BC8AF":"rgb(91, 200, 175)"},{"#DDD5D0":"rgb(221, 213, 208)","#CFC0BD":"rgb(207, 192, 189)","#B8B8AA":"rgb(184, 184, 170)","#7F9183":"rgb(127, 145, 131)","#586F6B":"rgb(88, 111, 107)"},{"#ECF8F8":"rgb(236, 248, 248)","#EEE4E1":"rgb(238, 228, 225)","#E7D8C9":"rgb(231, 216, 201)","#E6BEAE":"rgb(230, 190, 174)","#B2967D":"rgb(178, 150, 125)"},{"#C9CBA3":"rgb(201, 203, 163)","#FFE1A8":"rgb(255, 225, 168)","#E26D5C":"rgb(226, 109, 92)","#723D46":"rgb(114, 61, 70)","#472D30":"rgb(71, 45, 48)"},{"#6F2DBD":"rgb(111, 45, 189)","#A663CC":"rgb(166, 99, 204)","#B298DC":"rgb(178, 152, 220)","#B8D0EB":"rgb(184, 208, 235)","#B9FAF8":"rgb(185, 250, 248)"},{"#002028":"rgb(0, 32, 40)","#8C8418":"rgb(140, 132, 24)","#3B0014":"rgb(59, 0, 20)","#A44200":"rgb(164, 66, 0)","#E7AFE3":"rgb(231, 175, 227)"},{"#C0B9A2":"rgb(192, 185, 162)","#7F8C6A":"rgb(127, 140, 106)","#456E45":"rgb(69, 110, 69)","#325839":"rgb(50, 88, 57)","#1F352A":"rgb(31, 53, 42)"},{"#7DADC0":"rgb(125, 173, 192)","#F2D0D0":"rgb(242, 208, 208)","#F2BBBB":"rgb(242, 187, 187)","#F2F0F1":"rgb(242, 240, 241)","#A6A4A5":"rgb(166, 164, 165)","#595859":"rgb(89, 88, 89)"},{"#212B14":"rgb(33, 43, 20)","#7F9D6B":"rgb(127, 157, 107)","#9CAB91":"rgb(156, 171, 145)","#8BA5A6":"rgb(139, 165, 166)","#353575":"rgb(53, 53, 117)","#6978BB":"rgb(105, 120, 187)","#7786C7":"rgb(119, 134, 199)","#C096C8":"rgb(192, 150, 200)","#671F35":"rgb(103, 31, 53)","#95633E":"rgb(149, 99, 62)"},{"#121212":"rgb(18, 18, 18)","#FAFAFA":"rgb(250, 250, 250)","#F0F0F0":"rgb(240, 240, 240)","#E6E6E6":"rgb(230, 230, 230)","#CFCFCF":"rgb(207, 207, 207)","#1A1A1A":"rgb(26, 26, 26)","#262626":"rgb(38, 38, 38)","#141414":"rgb(20, 20, 20)","#333333":"rgb(51, 51, 51)"},{"#916606":"rgb(145, 102, 6)","#3C3A2D":"rgb(60, 58, 45)","#3C2D1B":"rgb(60, 45, 27)","#8F650F":"rgb(143, 101, 15)","#A85E3B":"rgb(168, 94, 59)","#8F5F42":"rgb(143, 95, 66)","#CB7A4F":"rgb(203, 122, 79)","#918F84":"rgb(145, 143, 132)","#A09C90":"rgb(160, 156, 144)"},{"#EDC4B3":"rgb(237, 196, 179)","#E6B8A2":"rgb(230, 184, 162)","#DEAB90":"rgb(222, 171, 144)","#D69F7E":"rgb(214, 159, 126)","#CD9777":"rgb(205, 151, 119)","#C38E70":"rgb(195, 142, 112)","#B07D62":"rgb(176, 125, 98)","#9D6B53":"rgb(157, 107, 83)","#8A5A44":"rgb(138, 90, 68)","#774936":"rgb(119, 73, 54)"},{"#FFBE86":"rgb(255, 190, 134)","#FFE156":"rgb(255, 225, 86)","#FFE9CE":"rgb(255, 233, 206)","#FFB5C2":"rgb(255, 181, 194)","#3777FF":"rgb(55, 119, 255)"},{"#0466C8":"rgb(4, 102, 200)","#0353A4":"rgb(3, 83, 164)","#023E7D":"rgb(2, 62, 125)","#002855":"rgb(0, 40, 85)","#001845":"rgb(0, 24, 69)","#001233":"rgb(0, 18, 51)","#33415C":"rgb(51, 65, 92)","#5C677D":"rgb(92, 103, 125)","#7D8597":"rgb(125, 133, 151)","#979DAC":"rgb(151, 157, 172)"},{"#0C1618":"rgb(12, 22, 24)","#004643":"rgb(0, 70, 67)","#FAF4D3":"rgb(250, 244, 211)","#D1AC00":"rgb(209, 172, 0)","#F6BE9A":"rgb(246, 190, 154)"},{"#EF6351":"rgb(239, 99, 81)","#F38375":"rgb(243, 131, 117)","#F7A399":"rgb(247, 163, 153)","#FBC3BC":"rgb(251, 195, 188)","#FFE3E0":"rgb(255, 227, 224)"},{"#F2D7EE":"rgb(242, 215, 238)","#D3BCC0":"rgb(211, 188, 192)","#A5668B":"rgb(165, 102, 139)","#69306D":"rgb(105, 48, 109)","#0E103D":"rgb(14, 16, 61)"},{"#EDAE49":"rgb(237, 174, 73)","#D1495B":"rgb(209, 73, 91)","#00798C":"rgb(0, 121, 140)","#30638E":"rgb(48, 99, 142)","#003D5B":"rgb(0, 61, 91)"},{"#0A2463":"rgb(10, 36, 99)","#FB3640":"rgb(251, 54, 64)","#605F5E":"rgb(96, 95, 94)","#247BA0":"rgb(36, 123, 160)","#E2E2E2":"rgb(226, 226, 226)"},{"#4F000B":"rgb(79, 0, 11)","#720026":"rgb(114, 0, 38)","#CE4257":"rgb(206, 66, 87)","#FF7F51":"rgb(255, 127, 81)","#FF9B54":"rgb(255, 155, 84)"},{"#588B8B":"rgb(88, 139, 139)","#FFFFFF":"rgb(255, 255, 255)","#FFD5C2":"rgb(255, 213, 194)","#F28F3B":"rgb(242, 143, 59)","#C8553D":"rgb(200, 85, 61)"},{"#FCAA67":"rgb(252, 170, 103)","#B0413E":"rgb(176, 65, 62)","#FFFFC7":"rgb(255, 255, 199)","#548687":"rgb(84, 134, 135)","#473335":"rgb(71, 51, 53)"},{"#FFFFFF":"rgb(255, 255, 255)","#84DCC6":"rgb(132, 220, 198)","#A5FFD6":"rgb(165, 255, 214)","#FFA69E":"rgb(255, 166, 158)","#FF686B":"rgb(255, 104, 107)"},{"#011627":"rgb(1, 22, 39)","#FDFFFC":"rgb(253, 255, 252)","#2EC4B6":"rgb(46, 196, 182)","#E71D36":"rgb(231, 29, 54)","#FF9F1C":"rgb(255, 159, 28)"},{"#A3A380":"rgb(163, 163, 128)","#D6CE93":"rgb(214, 206, 147)","#EFEBCE":"rgb(239, 235, 206)","#D8A48F":"rgb(216, 164, 143)","#BB8588":"rgb(187, 133, 136)"},{"#1D3461":"rgb(29, 52, 97)","#1F487E":"rgb(31, 72, 126)","#376996":"rgb(55, 105, 150)","#6290C8":"rgb(98, 144, 200)","#829CBC":"rgb(130, 156, 188)"},{"#8EA604":"rgb(142, 166, 4)","#F5BB00":"rgb(245, 187, 0)","#EC9F05":"rgb(236, 159, 5)","#D76A03":"rgb(215, 106, 3)","#BF3100":"rgb(191, 49, 0)"},{"#BA1200":"rgb(186, 18, 0)","#031927":"rgb(3, 25, 39)","#9DD1F1":"rgb(157, 209, 241)","#508AA8":"rgb(80, 138, 168)","#C8E0F4":"rgb(200, 224, 244)"},{"#031926":"rgb(3, 25, 38)","#468189":"rgb(70, 129, 137)","#77ACA2":"rgb(119, 172, 162)","#9DBEBB":"rgb(157, 190, 187)","#F4E9CD":"rgb(244, 233, 205)"},{"#0A0908":"rgb(10, 9, 8)","#22333B":"rgb(34, 51, 59)","#F2F4F3":"rgb(242, 244, 243)","#A9927D":"rgb(169, 146, 125)","#5E503F":"rgb(94, 80, 63)"},{"#F03A47":"rgb(240, 58, 71)","#AF5B5B":"rgb(175, 91, 91)","#F6F4F3":"rgb(246, 244, 243)","#276FBF":"rgb(39, 111, 191)","#183059":"rgb(24, 48, 89)"},{"#F9C80E":"rgb(249, 200, 14)","#F86624":"rgb(248, 102, 36)","#EA3546":"rgb(234, 53, 70)","#662E9B":"rgb(102, 46, 155)","#43BCCD":"rgb(67, 188, 205)"},{"#283D3B":"rgb(40, 61, 59)","#197278":"rgb(25, 114, 120)","#EDDDD4":"rgb(237, 221, 212)","#C44536":"rgb(196, 69, 54)","#772E25":"rgb(119, 46, 37)"},{"#EE6055":"rgb(238, 96, 85)","#60D394":"rgb(96, 211, 148)","#AAF683":"rgb(170, 246, 131)","#FFD97D":"rgb(255, 217, 125)","#FF9B85":"rgb(255, 155, 133)"},{"#F9E0D9":"rgb(249, 224, 217)","#E6DBD0":"rgb(230, 219, 208)","#7D6167":"rgb(125, 97, 103)","#754F5B":"rgb(117, 79, 91)","#5D4954":"rgb(93, 73, 84)"},{"#667761":"rgb(102, 119, 97)","#545E56":"rgb(84, 94, 86)","#917C78":"rgb(145, 124, 120)","#B79492":"rgb(183, 148, 146)","#EAE1DF":"rgb(234, 225, 223)"}];
        arr.forEach((p, i)=>{
            gradients["z" + i] = Object.keys(p);
        });

        return gradients;
    },


  //**************************************************************************
  //** createColorField
  //**************************************************************************
  /** Returns a combobox with color options
   */
    createColorField: function(parent, config){
        var createElement = javaxt.dhtml.utils.createElement;

      //Process inputs
        if (arguments.length===0){
            parent = document.createElement("div");
        }
        else if (arguments.length===1){
            if (!javaxt.dhtml.utils.isElement(parent)){
                config = parent;
                parent = createElement("div");
            }
        }


      //Set config
        if (!config) config = {};
        var defaultConfig = {
            style: javaxt.dhtml.style.default,
            discreteColors: true //discrete colors vs continuous range
        };
        javaxt.dhtml.utils.merge(config, defaultConfig);
        if (config.discreteColors!==false) config.discreteColors = true;



      //Create input
        var colorField = new javaxt.dhtml.ComboBox(parent, {
            style: config.style.combobox,
            readOnly: true,
            addNewOption: false,
            addNewOptionText: "Add New...",
            showMenuOnFocus: true
        });


      //Add color options
        var defaultValue;
        if (!config.colors) config.colors = bluewave.utils.getColorGradients();
        for (var key in config.colors) {
            if (config.colors.hasOwnProperty(key)){
                var colors = config.colors[key];

              //Create menu item
                var menuItem = createElement("div", "form-input-menu-color noselect");

              //Add colors
                if (config.discreteColors){
                    colors.forEach((color)=>{
                        createElement("div", menuItem, {
                            backgroundColor: color
                        });
                    });
                }
                else{

                    var colorRange = chroma.scale(colors);
                    var background = "linear-gradient(to right";
                    for (var i=0; i<colors.length; i++){
                        var p = javaxt.dhtml.utils.round((i/(colors.length-1)), 2);
                        var c = colorRange(p).css();
                        background+= ", " + c + " " + (p*100) + "%";
                    }
                    background+= ")";
                    menuItem.style.background = background;
                }

                colorField.add(menuItem, JSON.stringify(colors));
                if (!defaultValue) defaultValue = key;
            }
        }


      //Update the native setValue() method of the combobox
        var _setValue = colorField.setValue;
        colorField.setValue = function(color){
            if (typeof color === 'string' || color instanceof String){
                _setValue(color);
            }
            else{
                _setValue(JSON.stringify(color));
            }
        };


//        colorField.onMenuHover = function(label, value, el){
//            for (var key in config.colors) {
//                if (config.colors.hasOwnProperty(key)){
//                    var colors = config.colors[key];
//                    if (JSON.stringify(colors)===value){
//                        console.log(key);
//                        break;
//                    }
//                }
//            }
//        };


        return colorField;
    },


  //**************************************************************************
  //** createColorPicker
  //**************************************************************************
  /** Returns a panel used to select a color from the list of standard colors
   *  or to define a new color using a color wheel
   */
    createColorPicker: function(parent, config){
        if (!config) config = {};
        if (!config.style) config.style = javaxt.dhtml.style.default;
        var colors = config.colors;
        if (!colors) colors = bluewave.utils.getColorPalette(true);

        var colorPicker = {
            onChange: function(c){},
            setColor: function(c){},
            colorWheel: null,
            setColors: function(arr){}
        };


        var createElement = javaxt.dhtml.utils.createElement;
        var table = javaxt.dhtml.utils.createTable(parent);
        var td;

        td = table.addRow().addColumn();


        var checkbox = createElement("div");
        checkbox.innerHTML = '<i class="fas fa-check"></i>';


        var div = createElement("div", td);
        div.className = "color-picker-header";
        div.innerHTML = "Theme Colors";

        var themeColors = td;
        var blocks = [];
        colorPicker.setColors = function(colors){

            blocks.forEach((block)=>{
                var p = block.parentNode;
                p.removeChild(block);
            });
            blocks = [];

            colors.forEach((c)=>{
                div = createElement("div", themeColors, "color-picker-option");
                div.style.backgroundColor = c;
                div.onclick = function(){
                    if (checkbox.parentNode === this) return;
                    if (checkbox.parentNode) checkbox.parentNode.removeChild(checkbox);
                    this.appendChild(checkbox);
                    colorPicker.onChange(new iro.Color(this.style.backgroundColor).hexString);
                };
                blocks.push(div);
            });
        };
        colorPicker.setColors(colors);



        td = table.addRow().addColumn();
        var div = createElement("div", td, "color-picker-header noselect");
        div.innerHTML = "Custom Colors";


        var createNewColor = function(){

            div = createElement("div", td, "color-picker-option");
            div.onclick = function(){
                if (checkbox.parentNode === this) return;
                if (this.innerHTML === ""){
                    if (checkbox.parentNode) checkbox.parentNode.removeChild(checkbox);
                    this.appendChild(checkbox);
                    colorPicker.onChange(new iro.Color(this.style.backgroundColor).hexString);
                    return;
                }

                if (!colorPicker.colorWheel){

                    var callout = new javaxt.dhtml.Callout(document.body,{
                        style: {
                            panel: "color-picker-callout-panel",
                            arrow: "color-picker-callout-arrow"
                        }
                    });

                    var innerDiv = callout.getInnerDiv();
                    innerDiv.style.padding = "5px";
                    innerDiv.style.backgroundColor = "#fff";
                    var cp = new iro.ColorPicker(innerDiv, {
                      width: 280,
                      height: 280,
                      anticlockwise: true,
                      borderWidth: 1,
                      borderColor: "#fff",
                      css: {
                        "#output": {
                          "background-color": "$color"
                        }
                      }
                    });

                    colorPicker.colorWheel = callout;
                    colorPicker.colorWheel.getColor = function(){
                        return cp.color.hexString;
                    };

                    cp.on("color:change", function(c){
                        var div = colorPicker.colorWheel.target;
                        div.innerHTML = "";
                        div.style.backgroundColor = colorPicker.colorWheel.getColor();
                    });

                }


                var div = this;
                var rect = javaxt.dhtml.utils.getRect(div);
                var x = rect.x + rect.width + 5;
                var y = rect.y + (rect.height/2);
                colorPicker.colorWheel.target = div;
                colorPicker.colorWheel.showAt(x, y, "right", "middle");
                colorPicker.colorWheel.onHide = function(){
                    if (table.getElementsByClassName("color-picker-new-option").length>0) return;
                    createNewColor();
                };

            };

            var innerDiv = createElement("div", div, "color-picker-new-option");
            innerDiv.innerHTML = "<i class=\"fas fa-plus\"></i>";

        };

        createNewColor();


        return colorPicker;
    },


  //**************************************************************************
  //** createColorPickerCallout
  //**************************************************************************
  /** Returns a callout with a color picker
   */
    createColorPickerCallout: function(config){
        var createElement = javaxt.dhtml.utils.createElement;


      //Create popup
        var popup = new javaxt.dhtml.Callout(document.body,{
            style: {
                panel: "color-picker-callout-panel",
                arrow: "color-picker-callout-arrow"
            }
        });
        var innerDiv = popup.getInnerDiv();


      //Create title div
        var title = "Select Color";
        var titleDiv = createElement("div", innerDiv, "window-header");
        titleDiv.innerHTML = "<div class=\"window-title\">" + title + "</div>";


      //Create content div
        var contentDiv = createElement("div", innerDiv, {
            padding: "0 15px 15px",
            width: "325px",
            backgroundColor: "#fff"
        });


        var table = javaxt.dhtml.utils.createTable(contentDiv);
        var tr = table.addRow();
        var td = tr.addColumn();

        var cp = bluewave.utils.createColorPicker(td, config);

        popup.onHide = function(){
            if (cp.colorWheel && cp.colorWheel.isVisible()){
                cp.colorWheel.hide();
                popup.show();
            }
        };


        popup.onChange = function(color){};
        popup.setColor = function(color){
            cp.setColor(color);
        };
        popup.setColors = function(colors){
            cp.setColors(colors);
        };

        cp.onChange = function(color){
            popup.onChange(color);
        };

        return popup;
    },


  //**************************************************************************
  //** createLegend
  //**************************************************************************
    createLegend: function(parent){
        var createElement = javaxt.dhtml.utils.createElement;

        var legend = createElement("div", parent, "chart-legend");
        legend.addItem = function(label, color){
            var row = createElement("div", legend);
            if (color){
                var dot = createElement("div", row, "dot");
                dot.style.backgroundColor = color;
            }
            createElement("span", row).innerHTML = label;
        };
        legend.clear = function(){
            legend.innerHTML = "";
        };
        javaxt.dhtml.utils.addShowHide(legend);
        return legend;
    },


  //**************************************************************************
  //** resizeCanvas
  //**************************************************************************
  /** Fast image resize/resample algorithm using Hermite filter. Credit:
   *  https://stackoverflow.com/a/18320662/
   */
    resizeCanvas: function(canvas, width, height, resize_canvas) {
        var width_source = canvas.width;
        var height_source = canvas.height;
        width = Math.round(width);
        height = Math.round(height);

        var ratio_w = width_source / width;
        var ratio_h = height_source / height;
        var ratio_w_half = Math.ceil(ratio_w / 2);
        var ratio_h_half = Math.ceil(ratio_h / 2);

        var ctx = canvas.getContext("2d");
        var img = ctx.getImageData(0, 0, width_source, height_source);
        var img2 = ctx.createImageData(width, height);
        var data = img.data;
        var data2 = img2.data;

        for (var j = 0; j < height; j++) {
            for (var i = 0; i < width; i++) {
                var x2 = (i + j * width) * 4;
                var weight = 0;
                var weights = 0;
                var weights_alpha = 0;
                var gx_r = 0;
                var gx_g = 0;
                var gx_b = 0;
                var gx_a = 0;
                var center_y = (j + 0.5) * ratio_h;
                var yy_start = Math.floor(j * ratio_h);
                var yy_stop = Math.ceil((j + 1) * ratio_h);
                for (var yy = yy_start; yy < yy_stop; yy++) {
                    var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                    var center_x = (i + 0.5) * ratio_w;
                    var w0 = dy * dy; //pre-calc part of w
                    var xx_start = Math.floor(i * ratio_w);
                    var xx_stop = Math.ceil((i + 1) * ratio_w);
                    for (var xx = xx_start; xx < xx_stop; xx++) {
                        var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                        var w = Math.sqrt(w0 + dx * dx);
                        if (w >= 1) {
                            //pixel too far
                            continue;
                        }
                        //hermite filter
                        weight = 2 * w * w * w - 3 * w * w + 1;
                        var pos_x = 4 * (xx + yy * width_source);
                        //alpha
                        gx_a += weight * data[pos_x + 3];
                        weights_alpha += weight;
                        //colors
                        if (data[pos_x + 3] < 255)
                            weight = weight * data[pos_x + 3] / 250;
                        gx_r += weight * data[pos_x];
                        gx_g += weight * data[pos_x + 1];
                        gx_b += weight * data[pos_x + 2];
                        weights += weight;
                    }
                }
                data2[x2] = gx_r / weights;
                data2[x2 + 1] = gx_g / weights;
                data2[x2 + 2] = gx_b / weights;
                data2[x2 + 3] = gx_a / weights_alpha;
            }
        }
        //clear and resize canvas
        if (resize_canvas === true) {
            canvas.width = width;
            canvas.height = height;
        } else {
            ctx.clearRect(0, 0, width_source, height_source);
        }

        //draw
        ctx.putImageData(img2, 0, 0);
    },


  //**************************************************************************
  //** base64ToBlob
  //**************************************************************************
    base64ToBlob: function(base64, mime) {

        mime = mime || '';
        var sliceSize = 1024;
        var byteChars = window.atob(base64);
        var byteArrays = [];

        for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
            var slice = byteChars.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, {type: mime});
    },


  //**************************************************************************
  //** getPixel
  //**************************************************************************
    getPixel: function(){
        var pixel = bluewave.utils.pixel;
        if (!pixel){
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            pixel = canvas.toDataURL('image/png');
            bluewave.utils.pixel = pixel;
        }
        return pixel;
    },


  //**************************************************************************
  //** parseData
  //**************************************************************************
  /** Used to convert a dataset generated by the parseCSV and parseXLS methods
   *  into a JSON array.
   */
    parseData: function(data, config){
        var records = [];
        if (data==null || data.length==0) return records;



      //Extract data from xls sheet
        if (!javaxt.dhtml.utils.isArray(data[0])){
            var sheet;
            var sheetName = config.sheetName;
            if (sheetName){
                for (var i=0; i<data.length; i++){
                    if (data[i].name===sheetName){
                        sheet = data[i];
                        break;
                    }
                }
            }
            else{
                if (data[0].name && data[0].getData){
                    sheet = data[0];
                }
            }

            if (!sheet) return records;
            data = sheet.getData();
            if (data==null || data.length==0) return records;
        }



      //Set keys and offset
        var keys = [];
        var offset = 0;
        if (config.hasHeader===true){
            keys = data[0];
            offset = 1;
        }
        else{
            data[0].forEach((d, i)=>{
                keys.push((i+1)+"");
            });
        }


      //Create records
        for (var i=offset; i<data.length; i++){
            var record = {};
            data[i].forEach((d, j)=>{
                var key = keys[j];
                var val = d;
                record[key] = val;
            });
            records.push(record);
        }


        return records;
    },


  //**************************************************************************
  //** parseCSV
  //**************************************************************************
  /** Used to parse a delimited data. Returns a two-dimensional array of rows
   *  and columns.
   */
    parseCSV: function(text, options){
        if (!options) options = {};
        var defaultConfig = {
            headers: false,
            quote: "\"",
            separator: ","
        };
        javaxt.dhtml.utils.merge(options, defaultConfig);
        options.headers = false;
        if (text) text = text.trim();
        return alasql.from.CSV(text, options, null, 0, null);
    },


  //**************************************************************************
  //** parseXLS
  //**************************************************************************
  /** Used to parse an excel file (xls or xlsx). Returns an array json objects
   *  representing sheets in the excel file. Each entry in the array contains
   *  a "name" and a getData() function which returns a two-dimensional array
   *  of rows and columns in the sheet.
   */
    parseXLS: function(data, options){
        if (!options) options = {};

      //Get sheet.js
        var XLSX = alasql.utils.global.XLSX;


      //Get data type and update data as needed
        var dataType = 'binary';
        if (data instanceof ArrayBuffer){ //e.g. Data from FileReader.readAsArrayBuffer()
            dataType = 'base64';

          //https://github.com/SheetJS/js-xlsx/blob/5ae6b1965bfe3764656a96f536b356cd1586fec7/README.md
            var o = '',
                    l = 0,
                    w = 10240;
            for (; l < data.byteLength / w; ++l)
                    o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
            o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));

            data = btoa(o);
        }


      //Parse workbook
        var workbook = XLSX.read(data, {type: dataType, ...alasql.options.excel, ...options});
        var sheetNames = workbook.SheetNames;
        if (!sheetNames) sheetNames = [];


      //Return sheets
        var sheets = [];
        sheetNames.forEach((name, i)=>{
            sheets.push({
                name: name,
                getData: function(options){
                    if (!options) options = {};
                    var defaultConfig = {
                        headers: false
                    };
                    javaxt.dhtml.utils.merge(options, defaultConfig);
                    options.headers = false;
                    return bluewave.utils.parseWorkbook(this.name, workbook, options);
                }
            });
        });
        return sheets;
    },


  //**************************************************************************
  //** parseWorkbook
  //**************************************************************************
  /** Returns rows from a given sheet in a workbook. Code is adopted from
   *  https://github.com/AlaSQL/alasql/blob/develop/src/84from.js
   */
    parseWorkbook: function(sheetid, workbook, opt){
        if (!opt) opt = {};


        function getHeaderText(text) {
            // if casesensitive option is set to false and there is a text value return lowercase value of text
            if (text && alasql.options.casesensitive === false) {
                    return text.toLowerCase();
            } else {
                    return text;
            }
        }

        var range;
        var res = [];
        if (typeof opt.range === 'undefined') {
                range = workbook.Sheets[sheetid]['!ref'];
        } else {
                range = opt.range;
                if (workbook.Sheets[sheetid][range]) {
                        range = workbook.Sheets[sheetid][range];
                }
        }
        // if range has some value then data is present in the current sheet
        // else current sheet is empty
        if (range) {
                var rg = range.split(':');
                var col0 = rg[0].match(/[A-Z]+/)[0];
                var row0 = +rg[0].match(/[0-9]+/)[0];
                var col1 = rg[1].match(/[A-Z]+/)[0];
                var row1 = +rg[1].match(/[0-9]+/)[0];
                //		console.log(114,rg,col0,col1,row0,row1);
                //		console.log(114,rg,alasql.utils.xlscn(col0),alasql.utils.xlscn(col1));

                var hh = {};
                var xlscnCol0 = alasql.utils.xlscn(col0);
                var xlscnCol1 = alasql.utils.xlscn(col1);
                for (var j = xlscnCol0; j <= xlscnCol1; j++) {
                        var col = alasql.utils.xlsnc(j);
                        if (opt.headers) {
                                if (workbook.Sheets[sheetid][col + '' + row0]) {
                                        hh[col] = getHeaderText(workbook.Sheets[sheetid][col + '' + row0].v);
                                } else {
                                        hh[col] = getHeaderText(col);
                                }
                        } else {
                                hh[col] = col;
                        }
                }
                if (opt.headers) {
                        row0++;
                }
                for (var i = row0; i <= row1; i++) {

                        var row;
                        if (opt.headers) {
                            row = {};
                        }
                        else{
                            row = [];
                        }


                        for (var j = xlscnCol0; j <= xlscnCol1; j++) {
                                var col = alasql.utils.xlsnc(j);
                                var val = null;
                                if (workbook.Sheets[sheetid][col + '' + i]) {
                                    val = workbook.Sheets[sheetid][col + '' + i].v;
                                }

                                    if (opt.headers) {
                                        if (val) row[hh[col]] = val;
                                    }
                                    else{
                                        row.push(val);
                                    }
                        }
                        res.push(row);
                }
        } else {
                res.push([]);
        }

        // Remove last empty line (issue #548)
        if (res.length > 0 && res[res.length - 1] && Object.keys(res[res.length - 1]).length == 0) {
                res.pop();
        }

        return res;

    }

};




bluewave.utils.Confirm = null;

  //**************************************************************************
  //** confirm
  //**************************************************************************
  /** Overrides the native javascript confirm() method by creating a
   *  bluewave.utils.Confirm window.
   */
    var confirm = function(msg, config){

        if (!(typeof(msg) === 'string' || msg instanceof String)){
            config = msg;
        }


        javaxt.dhtml.utils.merge(config, {
            title: "Confirm",
            text: msg
        });


        var win = bluewave.utils.Confirm;
        if (!win){
            var body = document.getElementsByTagName("body")[0];

            var buttonDiv = document.createElement("div");
            buttonDiv.className = "button-div";

            var createButton = function(label, result){
                var input = document.createElement("input");
                input.type = "button";
                input.className = "form-button";
                input.onclick = function(){
                    win.result = this.result;
                    win.close();
                };
                input.setLabel = function(label){
                    if (label) this.name = this.value = label;
                };
                input.setValue = function(b){
                    if (b===true || b===false) this.result = b;
                };
                input.update = function(config){
                    if (config){
                        this.setLabel(config.label);
                        this.setValue(config.value);
                    }
                };
                input.setLabel(label);
                input.setValue(result);
                buttonDiv.appendChild(input);
                return input;
            };


            win = bluewave.utils.Confirm = new javaxt.dhtml.Window(body, {
                width: 450,
                height: 150,
                valign: "top",
                modal: true,
                footer: buttonDiv,
                style: {
                    panel: "window",
                    header: "window-header",
                    title: "window-title",
                    buttonBar: "window-header-button-bar",
                    button: "window-header-button",
                    body: "window-body confirm-body"
                }
            });


            win.leftButton = createButton("OK", true);
            win.rightButton = createButton("Cancel", false);
        }


        win.setTitle(config.title);
        win.setContent(config.text.replace("\n","<p></p>"));
        win.leftButton.update(config.leftButton);
        win.rightButton.update(config.rightButton);
        win.result = false;
        win.onClose = function(){
            var callback = config.callback;
            if (callback) callback.apply(win, [win.result]);
        };
        win.show();
        return false;
    };



bluewave.utils.Alert = null;

  //**************************************************************************
  //** alert
  //**************************************************************************
  /** Overrides the native javascript alert() method by creating a
   *  bluewave.utils.Alert window.
   */
    var alert = function(msg){

        if (msg==null) msg = "";


      //Special case for ajax request
        if (!(typeof(msg) === 'string' || msg instanceof String)){
            if (typeof msg.responseText !== 'undefined'){
                msg = (msg.responseText.length>0 ? msg.responseText : msg.statusText);
                if (!msg) msg = "Unknown Server Error";
            }
        }

        var win = bluewave.utils.Alert;

        if (!win){

            var body = document.getElementsByTagName("body")[0];


            var outerDiv = document.createElement('div');
            outerDiv.style.width = "100%";
            outerDiv.style.height = "100%";
            outerDiv.style.position = "relative";
            outerDiv.style.cursor = "inherit";
            var innerDiv = document.createElement('div');
            innerDiv.style.width = "100%";
            innerDiv.style.height = "100%";
            innerDiv.style.position = "absolute";
            innerDiv.style.overflowX = 'hidden';
            innerDiv.style.cursor = "inherit";
            outerDiv.appendChild(innerDiv);


            win = bluewave.utils.Alert = new javaxt.dhtml.Window(body, {
                width: 450,
                height: 200,
                valign: "top",
                modal: true,
                title: "Alert",
                body: outerDiv,
                style: {
                    panel: "window",
                    header: "window-header alert-header",
                    title: "window-title",
                    buttonBar: "window-header-button-bar",
                    button: "window-header-button",
                    body: "window-body alert-body"
                }
            });
            win.div = innerDiv;
        }


        win.div.innerHTML = msg;
        win.show();

    };