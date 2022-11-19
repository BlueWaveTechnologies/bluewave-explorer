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
        var div = document.createElement("div");
        div.className = "toolbar-spacer";
        toolbar.appendChild(div);
    },


  //**************************************************************************
  //** createToggleButton
  //**************************************************************************
    createToggleButton: function(parent, config){

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


        var div = document.createElement("div");
        div.className = config.style.panel;
        parent.appendChild(div);


        var onClick = function(btn, silent){
            if (btn.className===config.style.activeButton) return;
            div.reset();
            btn.className=config.style.activeButton;
            if (silent===true) return;
            if (config.onChange) config.onChange.apply(btn, [btn.innerHTML]);
        };

        for (var i=0; i<config.options.length; i++){
            var btn = document.createElement("div");
            btn.className = config.style.button;
            btn.innerHTML = config.options[i];
            btn.onclick = function(){
                onClick(this);
            };
            div.appendChild(btn);
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


        var div = document.createElement("div");
        div.className = "dashboard-item";
        div.style.width = width;
        div.style.height = height;
        div.style.position = "relative";
        parent.appendChild(div);

        var settings;
        if (config.settings===true){
            settings = document.createElement("div");
            settings.className = "dashboard-item-settings noselect";
            settings.innerHTML = '<i class="fas fa-cog"></i>';
            div.appendChild(settings);
        }


        var table = javaxt.dhtml.utils.createTable();
        var tbody = table.firstChild;
        var tr;

        tr = document.createElement("tr");
        tbody.appendChild(tr);
        var title = document.createElement("td");
        title.className = "chart-title noselect";
        title.innerHTML = config.title;
        tr.appendChild(title);

        tr = document.createElement("tr");
        tbody.appendChild(tr);
        var subtitle = document.createElement("td");
        subtitle.className = "chart-subtitle noselect";
        subtitle.innerHTML = config.subtitle;
        tr.appendChild(subtitle);

        tr = document.createElement("tr");
        tbody.appendChild(tr);
        var innerDiv = document.createElement("td");
        innerDiv.style.height = "100%";
        innerDiv.style.position = "relative";
        tr.appendChild(innerDiv);

        div.appendChild(table);

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
            style: config.style.table
        });


      //Load data
        if (hasHeader){

          //Create new dataset vs shift() because we don't want to modify the data!
            var data = [];
            for (var i=1; i<records.length; i++){
                data.push(records[i]);
            }
            grid.load(data, 1);
        }
        else{
            grid.load(records, 1);
        }

        return grid;
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



        var table = javaxt.dhtml.utils.createTable();
        var tbody = table.firstChild;
        var tr, td;

        tr = document.createElement("tr");
        tbody.appendChild(tr);
        td = document.createElement("td");
        tr.appendChild(td);


        var checkbox = document.createElement("div");
        checkbox.innerHTML = '<i class="fas fa-check"></i>';


        var div = document.createElement("div");
        div.className = "color-picker-header";
        div.innerHTML = "Theme Colors";
        td.appendChild(div);

        var themeColors = td;
        var blocks = [];
        colorPicker.setColors = function(colors){

            blocks.forEach((block)=>{
                var p = block.parentNode;
                p.removeChild(block);
            });
            blocks = [];

            colors.forEach((c)=>{
                div = document.createElement("div");
                div.className = "color-picker-option";
                div.style.backgroundColor = c;
                div.onclick = function(){
                    if (checkbox.parentNode === this) return;
                    if (checkbox.parentNode) checkbox.parentNode.removeChild(checkbox);
                    this.appendChild(checkbox);
                    colorPicker.onChange(new iro.Color(this.style.backgroundColor).hexString);
                };
                themeColors.appendChild(div);
                blocks.push(div);
            });
        };
        colorPicker.setColors(colors);


        tr = document.createElement("tr");
        tbody.appendChild(tr);
        td = document.createElement("td");
        tr.appendChild(td);

        var div = document.createElement("div");
        div.className = "color-picker-header noselect";
        div.innerHTML = "Custom Colors";
        td.appendChild(div);

        var createNewColor = function(){

            div = document.createElement("div");
            div.className = "color-picker-option";
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
            td.appendChild(div);
            var innerDiv = document.createElement("div");
            innerDiv.className = "color-picker-new-option";
            innerDiv.innerHTML = "<i class=\"fas fa-plus\"></i>";
            div.appendChild(innerDiv);

        };

        createNewColor();

        parent.appendChild(table);
        return colorPicker;
    },


  //**************************************************************************
  //** createColorPickerCallout
  //**************************************************************************
  /** Returns a callout with a color picker
   */
    createColorPickerCallout: function(config){

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
        var titleDiv = document.createElement("div");
        titleDiv.className = "window-header";
        titleDiv.innerHTML = "<div class=\"window-title\">" + title + "</div>";
        innerDiv.appendChild(titleDiv);


      //Create content div
        var contentDiv = document.createElement("div");
        contentDiv.style.padding = "0 15px 15px";
        contentDiv.style.width = "325px";
        contentDiv.style.backgroundColor = "#fff";
        innerDiv.appendChild(contentDiv);


        var table = javaxt.dhtml.utils.createTable();
        var tbody = table.firstChild;
        var tr = document.createElement('tr');
        tbody.appendChild(tr);



        var td = document.createElement('td');
        tr.appendChild(td);
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

        contentDiv.appendChild(table);
        return popup;
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