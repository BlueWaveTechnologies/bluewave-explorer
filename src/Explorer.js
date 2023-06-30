if(!bluewave) var bluewave={};

//******************************************************************************
//**  Explorer
//******************************************************************************
/**
 *   Panel used to explore data and create charts/graphs
 *
 ******************************************************************************/

bluewave.Explorer = function(parent, config) {
    this.className = "bluewave.Explorer";

    var me = this;
    var defaultConfig = {


      /** Define supported nodes and editors
       */
        nodes: [
            {
                title: "Pie Chart",
                type: "pieChart",
                icon: "fas fa-chart-pie",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.PieEditor
                },
                inputNodes: [
                    "datafile", "filter", "sankeyChart"
                ]
            },
            {
                title: "Bar Chart",
                type: "barChart",
                icon: "fas fa-chart-bar",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.BarEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Line Chart",
                type: "lineChart",
                icon: "fas fa-chart-line",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.LineEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Histogram Chart",
                type: "histogramChart",
                icon: "fas fa-chart-area",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.HistogramEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Scatter Chart",
                type: "scatterChart",
                icon: "fas fa-braille",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.ScatterEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Map",
                type: "mapChart",
                icon: "fas fa-globe-americas",
                editor: {
                    width: 1180,
                    height: 700,
                    resizable: true,
                    class: bluewave.editor.MapEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Treemap Chart",
                type: "treeMapChart",
                icon: "fas fa-basketball-ball",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.TreeMapEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Calendar Chart",
                type: "calendarChart",
                icon: "fas fa-th",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.CalendarEditor
                },
                inputNodes: [
                    "datafile", "filter"
                ]
            },
            {
                title: "Sankey Chart",
                type: "sankeyChart",
                icon: "fas fa-random",
                editor: {
                    width: 1680,
                    height: 920,
                    resizable: true,
                    class: bluewave.editor.SankeyEditor
                }
            },
            {
                title: "Filter",
                type: "filter",
                icon: "fas fa-filter",
                editor: {
                    width: 1060,
                    height: 600,
                    resizable: true,
                    class: bluewave.editor.FilterEditor
                },
                inputNodes: [
                    "datafile"
                ]
            }
        ],


      /** Define which nodes will appear in the toolbar
       */
        toolbar: {
            nodes: [
                "sankeyChart",
                "pieChart", "barChart", "lineChart",
                "histogramChart", "scatterChart",
                "mapChart", "treeMapChart", "calendarChart",
                "filter"
            ]
        },


      /** Define list of supported file types. Used when dragging/dropping
       *  data files onto the canvas.
       */
        supportedFileTypes: [
            "csv", "tab", "tsv", "xls", "xlsx", "pdf"
        ]
    };


    var id, name, description, thumbnail; //dashboard metadata
    var menubar, button = {}; //menu
    var tooltip, tooltipTimer, lastToolTipEvent; //tooltip
    var drawflow, nodes = {}; //drawflow
    var waitmask;
    var windows = [];
    var zoom = 0;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){


      //Merge user-defined config with defaultConfig
        me.setConfig(config);


      //Return early if there's no parent. But only do this AFTER the config
      //is set so the caller can call getConfig() and get the defaultConfig
        if (!parent) return;


      //Process config
        if (!config.fx) config.fx = new javaxt.dhtml.Effects();
        if (!config.style) config.style = javaxt.dhtml.style.default;
        waitmask = config.waitmask;
        if (!waitmask) waitmask = {
            show: function(){},
            hide: function(){}
        };


      //Create main panel
        var div = createElement("div", parent, {
            height: "100%",
            position: "relative"
        });
        div.setAttribute("desc", me.className);
        div.onwheel = function(e){
            e.preventDefault();
            if (drawflow){
                if (e.deltaY>0){
                    zoomOut();
                }
                else{
                    zoomIn();
                }
            }
        };
        div.tabIndex = -1;


      //Create drawflow
        createDrawFlow(div);


      //Create tooltip
        tooltip = new javaxt.dhtml.Callout(document.body,{
            style: {
                panel: "tooltip-panel",
                arrow: "tooltip-arrow"
            }
        });
        var _hideToolTip = tooltip.hide;
        tooltip.hide = function(){
            if (tooltipTimer) clearTimeout(tooltipTimer);
            _hideToolTip();
        };



        addShowHide(div);



        me.el = div;
        addShowHide(me);
    };


  //**************************************************************************
  //** onChange
  //**************************************************************************
  /** Called whenever something changes in this panel (e.g. nodeCreated,
   *  connectionCreated, zoomChange, etc). Additional information may be
   *  available after the first argument (e.g. node).
   */
    this.onChange = function(event){};


  //**************************************************************************
  //** setConfig
  //**************************************************************************
    this.setConfig = function(chartConfig){
        if (!chartConfig) config = defaultConfig;
        else config = merge(chartConfig, defaultConfig);
    };


  //**************************************************************************
  //** getConfig
  //**************************************************************************
  /** Returns the current config settings (see defaultConfig for an example)
   */
    this.getConfig = function(){
        return config;
    };


  //**************************************************************************
  //** addExtensions
  //**************************************************************************
    this.addExtensions = function(extensions){
        if (extensions) extensions.forEach(function(extension){
            addExtension(extension);
        });
    };


  //**************************************************************************
  //** setName
  //**************************************************************************
  /** Used to set a name for the current dashboard
   */
    this.setName = function(str){
        name = str;
    };


  //**************************************************************************
  //** getName
  //**************************************************************************
  /** Returns the name of the current dashboard
   */
    this.getName = function(){
        return name;
    };


  //**************************************************************************
  //** setDescription
  //**************************************************************************
  /** Used to set a description for the current dashboard
   */
    this.setDescription = function(str){
        description = str;
    };


  //**************************************************************************
  //** getDescription
  //**************************************************************************
  /** Returns the description of the current dashboard
   */
    this.getDescription = function(){
        return description;
    };


  //**************************************************************************
  //** setThumbnail
  //**************************************************************************
  /** Used to set a thumbnail for the current dashboard
   */
    this.setThumbnail = function(img){
        thumbnail = img;
    };


  //**************************************************************************
  //** getThumbnail
  //**************************************************************************
  /** Returns a thumbnail for the current dashboard
   */
    this.getThumbnail= function(){
        return thumbnail;
    };



  //**************************************************************************
  //** setID
  //**************************************************************************
  /** Used to set an ID for the current dashboard
   */
    this.setID = function(i){
        id = i;
    };


  //**************************************************************************
  //** getID
  //**************************************************************************
  /** Returns the id of the current dashboard
   */
    this.getID = function(){
        return id;
    };


  //**************************************************************************
  //** getDashboard
  //**************************************************************************
  /** Returns all the information required to reconstruct the current view
   */
    this.getDashboard = function(){


      //Create dashboard object
        var dashboard = {
            id: id,
            name: name,
            description: description,
            className: me.className,
            thumbnail: thumbnail
        };


        dashboard.info = {
            layout: drawflow.export().drawflow.Home.data,
            nodes: {},
            zoom: zoom
        };


      //Add nodes
        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                dashboard.info.nodes[key] = {
                    name: node.name,
                    type: node.type,
                    config: node.config,
                    preview: node.preview
                };


              //Special case for data files
                if (node.type==="datafile"){
                    if (node.data){
                        dashboard.info.nodes[key].data = node.data;
                    }
                }
            }
        };

        return dashboard;
    };


  //**************************************************************************
  //** getNodes
  //**************************************************************************
  /** Returns a JSON object representing all the nodes in the graph. Use with
   *  caution! Modifying the nodes can lead to unexpected results. Consider
   *  using the getDashboard() to get a shallow copy of the nodes.
   */
    this.getNodes = function(){
        return nodes;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){

      //Reset class variables
        id = name = description = thumbnail = null;
        nodes = {};

      //Clear drawflow
        drawflow.clear();

      //Reset buttons
        for (var buttonName in button) {
            if (button.hasOwnProperty(buttonName)){
                button[buttonName].disable();
            }
        }

      //Hide any popup dialogs
        for (var i in windows){
            windows[i].hide();
        }

        zoom = 0;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
  /** Used to render a dashboard
   *  @param dashboard JSON object with dashboard info (see getDashboard)
   *  @param readOnly If true, prevent user from editing
   */
    this.update = function(dashboard, readOnly, callback){


      //Process args
        if (!dashboard) dashboard = {};


      //Reset panels and class variables
        me.clear();



      //Update class variables
        id = dashboard.id;
        name = dashboard.name;
        description = dashboard.description;
        if (!description && dashboard.info){
            description = dashboard.info.description;
        }
        thumbnail = dashboard.thumbnail;


      //Set view mode
        drawflow.editor_mode = readOnly ? "view" : "edit";


      //Update buttons
        updateButtons();


      //Set mouse focus
        me.el.focus();


      //Return early if the dashboard is missing config info
        if (!dashboard.info){
            if (callback) callback.apply(me, []);
            return;
        }


      //Import layout
        drawflow.import({
            drawflow: {
                Home: {
                    data: dashboard.info.layout
                }
            }
        });




      //Update nodes
        var thumbnails = [];
        var connectionNodes = [];
        for (var nodeID in dashboard.info.nodes) {
            if (dashboard.info.nodes.hasOwnProperty(nodeID)){

              //Get node (dom object)
                var drawflowNode = drawflow.getNodeFromId(nodeID);
                var temp = createElement("div");
                temp.innerHTML = drawflowNode.html;
                var node = document.getElementById(temp.childNodes[0].id);


              //Add props to node
                var props = dashboard.info.nodes[nodeID];
                for (var key in props) {
                    if (props.hasOwnProperty(key)){
                        var val = props[key];
                        node[key] = val;
                    }
                }


              //Special case for older maps
                if (node.type==="map") node.type = "mapChart";


              //Update title
                if (props.config.chartTitle) updateTitle(node, props.config.chartTitle);


              //Check if there's a thumbnail/preview. If so, we'll render it later
                if (props.preview) thumbnails.push({
                    node: node,
                    thumbnail: props.preview
                });



              //Add event listeners
                addEventListeners(node);



              //Add inputs
                node.inputs = {};
                for (var key in drawflowNode.inputs) {
                    if (drawflowNode.inputs.hasOwnProperty(key)){
                        var connections = drawflowNode.inputs[key].connections;
                        for (var i in connections){
                            var connection = connections[i];
                            var inputID = connection.node;
                            var inputNode = nodes[inputID];
                            node.inputs[inputID] = inputNode;
                            connectionNodes.push(inputID);
                        }
                    }
                }


              //Update nodes variable
                nodes[nodeID] = node;


            }
        }



      //Fill in any missing node inputs
        for (var nodeID in nodes){
            var node = nodes[nodeID];
            for (var inputID in node.inputs){
                var inputNode = node.inputs[inputID];
                if (!inputNode) node.inputs[inputID] = nodes[inputID];
            }
        }




      //Find filter nodes
        var filterEditors = [];
        for (var nodeID in nodes){
            var node = nodes[nodeID];
            if (node.type==="filter"){
                var editor = getNodeEditor(node);
                if (editor) filterEditors.push(editor);
            }
        }



      //Function to run when all the nodes are ready
        var onReady = function(){
            updateButtons();
            setTimeout(function(){

              //Update connections
                for (var i=0; i<connectionNodes.length; i++){
                    var inputID = connectionNodes[i];
                    drawflow.updateConnectionNodes("node-"+inputID);
                }

              //Update thumbnails
                for (var i=0; i<thumbnails.length; i++){
                    (function (t) {
                        var el = t.node.childNodes[1];
                        onRender(el, function(){
                            createThumbnail(t.node, t.thumbnail);
                        });
                    })(thumbnails[i]);
                }

                setZoom(dashboard.info.zoom);


                me.el.focus();

                if (callback) callback.apply(me, []);

            },500); //slight delay for drawflow
        };




      //Run onReady when ready...
        if (filterEditors.length===0){
            onReady();
        }
        else{

          //Run scripts in the filter nodes
            waitmask.show();
            var applyFilter = function(){

                if (filterEditors.length===0){
                    waitmask.hide();
                    onReady();
                    return;
                }

                var editor = filterEditors.shift();
                var node = editor.getNode();
                editor.update(node, function(){
                    if (editor.getData){
                        editor.getData(function(data){
                            if (!data) node.data = [];
                            else node.data = JSON.parse(JSON.stringify(data));
                        });
                    }
                    editor.clear(); //clean up the dom
                    applyFilter();
                });

            };

            applyFilter();

        }
    };


  //**************************************************************************
  //** updateButtons
  //**************************************************************************
    var updateButtons = function(){


      //Disable all buttons
        for (var key in button) {
            if (button.hasOwnProperty(key)){
                button[key].disable();
            }
        }


      //Return early as needed
        if (me.isReadOnly()) return;


      //Generate a unique list of visible node types
        var visibleNodes = {};
        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                visibleNodes[node.type] = true;
            }
        }


      //Enable buttons based on what nodes are in the canvas
        config.nodes.forEach(function(n){
            var menuButton = button[n.type];
            if (!menuButton) return;

            var inputNodes = n.inputNodes;
            if (!inputNodes) inputNodes = [];
            if (inputNodes.length>0){
                inputNodes.every(function(t){

                    var hasValidNode = false;
                    var required = true;
                    if (typeof t === "string"){
                        hasValidNode = visibleNodes[t];
                    }
                    else{
                        hasValidNode = visibleNodes[t.inputNode];
                        required = t.required;
                    }


                    if (hasValidNode){
                        menuButton.enable();
                        return false;
                    }
                    else{
                        if (!required) menuButton.enable();
                    }


                    return true;
                });
            }
            else{
                menuButton.enable();
            }
        });

    };


  //**************************************************************************
  //** setReadOnly
  //**************************************************************************
    this.setReadOnly = function(readOnly){
        if (readOnly===true){
            if (me.isReadOnly()) return;
            drawflow.editor_mode = "view";
        }
        else{
            if (!me.isReadOnly()) return;
            drawflow.editor_mode = "edit";
        }
        updateButtons();
    };


  //**************************************************************************
  //** isReadOnly
  //**************************************************************************
  /** Returns true if the view is read-only
   */
    this.isReadOnly = function(){
        return (drawflow.editor_mode==="view");
    };


  //**************************************************************************
  //** getToolbar
  //**************************************************************************
  /** Returns the DOM element containing all the buttons
   */
    this.getToolbar = function(){
        return menubar;
    };


  //**************************************************************************
  //** getButtons
  //**************************************************************************
  /** Returns a JSON object with all the buttons in the toolbar
   */
    this.getButtons = function(){
        return button;
    };


  //**************************************************************************
  //** getFileNodes
  //**************************************************************************
  /** Returns an array of nodes associated with a file
   */
    var getFileNodes = function(){
        var fileNodes = [];
        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                if (isValidFile(node.type)){
                    fileNodes.push(node);
                }
            }
        }
        return fileNodes;
    };


  //**************************************************************************
  //** createDrawFlow
  //**************************************************************************
    var createDrawFlow = function(parent){

        var div = createElement("div", parent, "drawflow");
        div.addEventListener('dragover', onDragOver, false);
        div.addEventListener('drop', onDrop, false);


        drawflow = new Drawflow(div);
        drawflow.reroute = true;
        drawflow.start();
        drawflow.on('connectionCreated', function(info) {

          //Get input/output IDs
            var outputID = info.output_id+"";
            var inputID = info.input_id+"";
            //console.log("Connected " + outputID + " to " + inputID);


          //Get target and input nodes
            var node = nodes[inputID];
            var inputNode = nodes[outputID];



            var acceptConnection = false;
            config.nodes.every(function(n){
                if (n.type===node.type){
                    var inputNodes = n.inputNodes;
                    if (inputNodes){
                        inputNodes.forEach(function(t){
                            if (typeof t === "string"){
                                if (inputNode.type === t){
                                    acceptConnection = true;
                                }
                            }
                            else{
                                if (t.inputNode===inputNode.type){
                                    acceptConnection = true;
                                }
                            }
                        });
                    }
                    else{
                        if (node.type==="layout") acceptConnection=true;
                    }
                    return false;
                }
                return true;
            });


            if (acceptConnection){
                node.inputs[outputID] = inputNode;
                node.ondblclick();
            }
            else{
                drawflow.removeSingleConnection(info.output_id, info.input_id, info.output_class, info.input_class);
            }

            me.onChange('connectionCreated');

        });
        drawflow.on('nodeRemoved', function(nodeID) {
            removeInputs(nodes, nodeID);
            var node = nodes[nodeID+""];
            delete nodes[nodeID+""];
            updateButtons();

            me.onChange('nodeRemoved', node);
        });
        drawflow.on('connectionRemoved', function(info) {
            var outputID = info.output_id+"";
            var inputID = info.input_id+"";
            var node = nodes[inputID];
            delete node.inputs[outputID+""];

            me.onChange('connectionRemoved');
        });
        drawflow.on('contextmenu', function(e) {
            setTimeout(function(){
                for (var key in nodes) {
                    if (nodes.hasOwnProperty(key)){
                        var node = nodes[key];
                        var parentNode = node.parentNode.parentNode;
                        var deleteDiv = parentNode.getElementsByClassName("drawflow-delete")[0];
                        if (deleteDiv){
                            parentNode.removeChild(deleteDiv);
                            deleteDiv = createElement("div", parentNode, "drawflow-delete2");
                            deleteDiv.innerHTML = "&#x2715";
                            deleteDiv.nodeID = parseInt(key);
                            deleteDiv.onclick = function(){
                                var div = this;
                                var nodeID = div.nodeID;
                                confirm("Are you sure you want to delete this node?",{
                                    leftButton: {label: "Yes", value: true},
                                    rightButton: {label: "No", value: false},
                                    callback: function(yes){
                                        if (yes){
                                            drawflow.removeNodeId("node-"+nodeID);
                                        }
                                        else{
                                            div.parentNode.removeChild(div);
                                        }
                                    }
                                });

                            };
                        }
                    }
                }
            },200);
        });
        drawflow.on('nodeMoved', function(nodeID){
            me.onChange('nodeMoved', nodes[nodeID+""]);
        });


      //Create toolbar
        menubar = createElement("div", div, "drawflow-toolbar");



      //Add buttons to the toolbar
        config.toolbar.nodes.forEach((toolbarItem)=>{
            if (typeof toolbarItem === "string"){

              //Find node config for the toolbarItem
                config.nodes.every((node)=>{
                    if (toolbarItem===node.type){

                      //Create button
                        var btn = createMenuButton(node.type, node.icon, node.title);


                      //Enable button if the node doesn't require inputs
                        if (node.inputNodes){
                            if (isArray(node.inputNodes)){
                                if (node.inputNodes.length===0) btn.enable();;
                            }
                        }
                        else{
                            btn.enable();
                        }

                        return false;
                    }
                    return true;
                });
            }
            else if (isArray(toolbarItem)){

            }
        });


    };


  //**************************************************************************
  //** setZoom
  //**************************************************************************
    var setZoom = function(z){
        z = parseInt(z);
        if (isNaN(z) || z===zoom) return;
        var d = Math.abs(z, zoom);
        for (var i=0; i<d; i++){
            if (z<zoom){
                zoomOut();
            }
            else{
                zoomIn();
            }
        }
        me.onChange('zoomChange');
    };


  //**************************************************************************
  //** zoomIn
  //**************************************************************************
    var zoomIn = function(){
        drawflow.zoom_in();
        zoom++;
    };


  //**************************************************************************
  //** zoomOut
  //**************************************************************************
    var zoomOut = function(){
        drawflow.zoom_out();
        zoom--;
    };


  //**************************************************************************
  //** drag
  //**************************************************************************
    var drag = function(ev) {
        if (ev.type === "touchstart") {
            /*
            mobile_item_selec = ev.target
                .closest(".drag-drawflow")
                .getAttribute("data-node");
            */
        }
        else {
            ev.dataTransfer.setData(
                "node",
                ev.target.getAttribute("data-node")
            );
        }
    };


  //**************************************************************************
  //** onDragOver
  //**************************************************************************
  /** Called when the client drags something over the canvas (e.g. file)
   */
    var onDragOver = function(e) {
        e.stopPropagation();
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy
    };


  //**************************************************************************
  //** onDrop
  //**************************************************************************
  /** Called when the client drops something onto the canvas (e.g. file or icon)
   */
    var onDrop = function(e) {

        e.stopPropagation();
        e.preventDefault();


        if (e.type === "touchend") {
            /*
            let parentdrawflow = document
                .elementFromPoint(
                    mobile_last_move.touches[0].clientX,
                    mobile_last_move.touches[0].clientY
                )
                .closest("#drawflow");
            if (parentdrawflow != null) {
                addNodeToDrawFlow(
                    mobile_item_selec,
                    mobile_last_move.touches[0].clientX,
                    mobile_last_move.touches[0].clientY
                );
            }
            mobile_item_selec = "";
            */
        }
        else {

            var x = e.clientX;
            var y = e.clientY;

            var files = e.dataTransfer.files;
            if (files.length>0){


              //Generate list of exsiting files in the canvas
                var existingFiles = {};
                var fileNodes = getFileNodes();
                for (var i=0; i<fileNodes.length; i++){
                    var fileNode = fileNodes[i];
                    var fileName = fileNode.config.fileName;
                    existingFiles[fileName.toLowerCase()] = fileNode;
                }


              //Generate list of new files
                var arr = [];
                for (var i=0; i<files.length; i++) {
                    var file = files[i];
                    if (isValidFile(file)){

                        var fileName = file.name.toLowerCase();
                        if (existingFiles[fileName]){
                            //notify user?
                        }
                        else{
                            arr.push(file);
                        }
                    }
                }


              //Return early if there's nothing to add
                if (arr.length===0) return;


              //Add files
                var uploads = 0;
                var failures = [];
                waitmask.show();
                var upload = function(){

                    if (arr.length===0){
                        waitmask.hide();
                        if (failures.length>0){
                            alert("Failed to upload " + failures);
                        }
                        return;
                    }

                    var file = arr.shift();
                    var ext = getFileExtension(file);
                    if (isValidFile(ext)){
                        var formData = new FormData();
                        formData.append(file.name, file);

                        if (uploads>0){
                            x+=35;
                            y+=85;
                        }
                        uploads++;


                        addNodeToDrawFlow(ext, x, y, file);


                        upload();

                    }

//                    post("document", formData, {
//                        success: function(text){
//                            var results = JSON.parse(text);
//                            if (results[0].result==="error"){
//                                failures.push(file.name);
//                            }
//                            else{
//
//                                if (uploads>0){
//                                    x+=35;
//                                    y+=85;
//                                }
//                                uploads++;
//
//                                addNodeToDrawFlow(ext, x, y, file);
//                            }
//
//                            upload();
//                        },
//                        failure: function(request){
//                            failures.push(file.name);
//                            upload();
//                        }
//                    });
                };
                upload();

                if (uploads>0) updateButtons();

            }
            else{
                let nodeType = e.dataTransfer.getData("node");
                addNodeToDrawFlow(nodeType, x, y);
            }
        }
    };


  //**************************************************************************
  //** addNodeToDrawFlow
  //**************************************************************************
    var addNodeToDrawFlow = function (nodeType, pos_x, pos_y, file) {

      //Don't add node if the view is "fixed"
        if (drawflow.editor_mode === "fixed")  return false;


      //Update x/y position
        pos_x =
            pos_x *
                (drawflow.precanvas.clientWidth /
                    (drawflow.precanvas.clientWidth * drawflow.zoom)) -
            drawflow.precanvas.getBoundingClientRect().x *
                (drawflow.precanvas.clientWidth /
                    (drawflow.precanvas.clientWidth * drawflow.zoom));
        pos_y =
            pos_y *
                (drawflow.precanvas.clientHeight /
                    (drawflow.precanvas.clientHeight * drawflow.zoom)) -
            drawflow.precanvas.getBoundingClientRect().y *
                (drawflow.precanvas.clientHeight /
                    (drawflow.precanvas.clientHeight * drawflow.zoom));




      //Get node config for the given node type
        var nodeConfig = getNodeConfig(nodeType);
        if (!nodeConfig){
            console.log("Unsupported Node Type: " + nodeType);
            return;
        }

      //Tweak nodeConfig if we have a file
        if (file){
            nodeConfig.type = "datafile";
            nodeConfig.title = file.name;
        }


      //Reset nodeType using nodeConfig
        nodeType = nodeConfig.type;



      //Set icon and title for the node
        var icon = nodeConfig.icon;
        var title = nodeConfig.title;



      //Set inputs and outputs
        var inputs = 0;
        var outputs = 1;
        if (nodeConfig.inputNodes){
            if (isArray(nodeConfig.inputNodes)){
                if (nodeConfig.inputNodes.length>0) inputs = 1;
            }
        }
        if (nodeConfig.output===false) outputs = 0;


      //Create node
        var node = createNode({
            name: title,
            type: nodeType,
            icon: icon,
            content: createElement("i", icon),
            position: [pos_x, pos_y],
            inputs: inputs,
            outputs: outputs
        });

        addEventListeners(node);

        me.onChange('nodeCreated', node);



      //Special case for files
        if (file){
            node.file = file;
            node.config.fileName = file.name;
            node.ondblclick();
        }
    };


  //**************************************************************************
  //** addEventListeners
  //**************************************************************************
    var addEventListeners = function(node){
        node.ondblclick = function(){

            var editor = getNodeEditor(node);
            if (editor){
                editor.clear();
                editor.show();
                var delay = editor.getData ? 300 : 50;
                setTimeout(()=>{
                    editor.update(node);
                }, delay);
            }

        };
    };


  //**************************************************************************
  //** createNode
  //**************************************************************************
    var createNode = function(node){

        var div = createElement("div");
        div.id = "_"+new Date().getTime();

        var title = createElement("div", div, "drawflow-node-title");
        title.innerHTML = "<i class=\"" + node.icon + "\"></i><span>" + node.name + "</span>";

        var body = createElement("div", div, "drawflow-node-body");
        var content = node.content;
        if (content){
            if (typeof content === "string"){
                body.innerHTML = content;
            }
            else{
                body.appendChild(content);
            }
        }


        var nodeID = drawflow.addNode(
            node.type,
            node.inputs,
            node.outputs,
            node.position[0],
            node.position[1],
            "",
            {},
            div.outerHTML
        );

        div = document.getElementById(div.id);
        div.type = node.type;
        div.inputs = {};
        div.config = {};
        nodes[nodeID+""] = div;
        return div;
    };


  //**************************************************************************
  //** getNodeConfig
  //**************************************************************************
    var getNodeConfig = function(nodeType){
        var nodeConfig;

      //Find nodeConfig from list of default "nodes" (see defaultConfig for an example)
        config.nodes.every((n)=>{
            if (n.type===nodeType){
                nodeConfig = n;
                return false;
            }
            return true;
        });


      //If nodeConfig not found in the explorer config, check if the "nodeType"
      //represents a valid file extension (e.g. "csv")
        if (!nodeConfig && (nodeType==="datafile" || isValidFile(nodeType))){


            switch (nodeType){
              case "csv":
              case "xls":
              case "xlsx":
              case "datafile":

              //Set icon for the node
                var icon = "fas fa-file-alt";
                if (nodeType==="csv"){
                    icon = "fas fa-file-csv";
                }
                if (nodeType==="xls" || nodeType==="xlsx"){
                    icon = "fas fa-file-excel";
                }

              //Create nodeConfig. Note for "datafile" nodeType all we care
              //about is the editor.
                nodeConfig = {
                    title: nodeType + " Data",
                    icon: icon,
                    editor: {
                        width: 1060,
                        height: 600,
                        resizable: true,
                        class: bluewave.editor.CsvEditor
                    }
                };

                break;

              case "pdf":
                var icon = "fas fa-file-pdf";

                break;
            }
        }

        return nodeConfig;
    };


  //**************************************************************************
  //** getNodeEditor
  //**************************************************************************
    this.getNodeEditor = function(node){
        return getNodeEditor(node);
    };


  //**************************************************************************
  //** getNodeEditor
  //**************************************************************************
    var getNodeEditor = function(node){


      //Find config associated with the node
        var nodeConfig = getNodeConfig(node.type);
        if (!nodeConfig) return;


      //Instantiate node editor as needed
        var editor = nodeConfig.editor;
        if (editor.class){


          //Update default titles for files
            if (node.type==="datafile"){
                editor.title = node.config.fileName;
            }


          //Instantiate editor and assign it to the nodeConfig
            editor = createNodeEditor(editor);
            nodeConfig.editor = editor;


          //Special case for editors that broadcast onSave or onChange events
            if (editor.onSave || editor.onChange){
                var save = function(){
                    if (me.isReadOnly()) return;

                    var chartConfig = editor.getConfig();
                    var node = editor.getNode();
                    node.config = JSON.parse(JSON.stringify(chartConfig));
                    me.onChange('nodeUpdated', node);

                    //TODO: Update thumbnail?
                };


                if (editor.onSave){
                    editor.onSave = function(){
                        save();
                    };
                }

                if (editor.onChange){
                    editor.onChange = function(){
                        save();
                    };
                }
            }
        }


      //Add custom getNode function to the editor
        editor.getNode = function(){
            return node;
        };


      //Special case for editors with getData() method. We want to assign data
      //to the node after an update.
        if (editor.getData){
            var _update = editor.update;
            editor.update = function(node, callback){
                _update(node, callback);
                editor.getData(function(data){
                    if (!data) node.data = [];
                    else node.data = JSON.parse(JSON.stringify(data));
                });
            };
        }

        return editor;
    };


  //**************************************************************************
  //** createNodeEditor
  //**************************************************************************
    var createNodeEditor = function(editorConfig){

        merge(editorConfig, {
            title: "Edit Chart",
            width: 1060,
            height: 600,
            resizable: false,
            beforeClose: null,
            style: config.style
        });


        var style = merge({
            body: {
                padding: "0px"
            },
            closeIcon: {
                //content: "&#10006;",
                content: "&#x2715;",
                lineHeight: "16px",
                textAlign: "center"
            }
        }, config.style.window);


        var win = createWindow({
            title: editorConfig.title,
            width: editorConfig.width,
            height: editorConfig.height,
            modal: true,
            resizable: editorConfig.resizable,
            shrinkToFit: true,
            style: style,
            renderers: {

              //Create custom renderer for the close button. Basically, we
              //want to delay closing the window until after the thumbnail
              //is created
                headerButtons: function(buttonDiv){
                    var btn = createElement('div', buttonDiv, style.button);
                    createElement('div', btn, style.closeIcon);
                    btn.onclick = function(){
                        if (editorConfig.beforeClose){
                            editorConfig.beforeClose.apply(me, [win]);
                        }
                        else{
                            //win.close();
                            var editor = win.editor;
                            var node = editor.getNode();
                            if (editor.getData){
                                editor.getData(function(data){
                                    if (!data) node.data = [];
                                    else node.data = JSON.parse(JSON.stringify(data));
                                });
                            }
                            var chartConfig = editor.getConfig();
                            var orgConfig = node.config;
                            if (!orgConfig) orgConfig = {};
                            if (isDirty(chartConfig, orgConfig)){
                                me.onChange('nodeUpdated', node);
                                node.config = JSON.parse(JSON.stringify(chartConfig));
                                updateTitle(node, node.config.chartTitle);
                                if (editor.getChart){
                                    waitmask.show();
                                    var el = editor.getChart();
                                    if (el.show) el.show();
                                    setTimeout(function(){
                                        createPreview(el, function(canvas){
                                            if (canvas && canvas.toDataURL){
                                                node.preview = canvas.toDataURL("image/png");
                                                me.onChange('nodeUpdated', node);
                                                createThumbnail(node, canvas);
                                            }
                                            win.close();
                                            editor.clear();
                                            waitmask.hide();
                                        }, this);
                                    },800);
                                }
                                else{
                                    win.close();
                                    editor.clear();
                                }
                            }
                            else{
                                updateTitle(node, node.config.chartTitle);
                                win.close();
                                editor.clear();
                            }

                            updateButtons();
                        }
                    };

                }
            }
        });


        if (editorConfig.class){

            if (typeof editorConfig.class === "string"){
                editorConfig.class = eval(editorConfig.class);
            }

            var editor = new editorConfig.class(win.getBody(), editorConfig);
            editor.show = function(){
                win.show();
            };

            editor.hide = function(){
                win.hide();
            };

            win.onResize = function(){
                if (editor.resize) editor.resize();
            };

            win.editor = editor;

            return editor;
        }
    };


  //**************************************************************************
  //** updateTitle
  //**************************************************************************
  /** Updates the title of a drawflow node
   */
    var updateTitle = function(node, title) {
        if (title) {
            node.childNodes[0].getElementsByTagName("span")[0].innerHTML = title;
        }
    };


  //**************************************************************************
  //** removeInputs
  //**************************************************************************
    var removeInputs = function(nodes, nodeID){
        for(var key in nodes){
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                for(var inputID in node.inputs){
                    if(inputID === nodeID){
                        delete node.inputs[nodeID+""];
                    }
                }
            }
        }
    };


  //**************************************************************************
  //** createWindow
  //**************************************************************************
    var createWindow = function(config){
        var win = new javaxt.dhtml.Window(document.body, config);
        windows.push(win);
        return win;
    };


  //**************************************************************************
  //** createPreview
  //**************************************************************************
    var createPreview = function(el, callback, scope){
        html2canvas(el)
        .then((canvas) => {
            if (callback) callback.apply(scope, [canvas]);
        })
        .catch(function(error){
            if (callback) callback.apply(scope, ["Preview Failed: " + error]);
        });
    };


  //**************************************************************************
  //** createThumbnail
  //**************************************************************************
  /** Inserts a PNG image into a node
   */
    var createThumbnail = function(node, obj){
        var el = node.childNodes[1];

        el.innerHTML = "";
        var rect = javaxt.dhtml.utils.getRect(el);
        var width = rect.width;
        var height = rect.height;

        var div = createElement('div', el, {
            width: "100%",
            height: "100%"
        });


        var rect = javaxt.dhtml.utils.getRect(div);
        el.innerHTML = "";
        var padding = width-rect.width;
        var maxWidth = width-padding;
        var maxHeight = height-padding;
        var width = 0;
        var height = 0;

        var setWidth = function(){
            var ratio = maxWidth/width;
            width = width*ratio;
            height = height*ratio;
        };

        var setHeight = function(){
            var ratio = maxHeight/height;
            width = width*ratio;
            height = height*ratio;
        };

        var resize = function(canvas){
            width = canvas.width;
            height = canvas.height;

            if (maxHeight<maxWidth){

                setHeight();
                if (width>maxWidth) setWidth();
            }
            else{
                setWidth();
                if (height>maxHeight) setHeight();
            }

            if (width===0 || height===0) return;
            resizeCanvas(canvas, width, height, true);
            var base64image = canvas.toDataURL("image/png");

            var img = createElement("img", "noselect");
            img.onload = function() {
                el.appendChild(this);
            };
            img.src = base64image;
            img.ondragstart = function(e){
                e.preventDefault();
            };

        };


        if (typeof obj === "string"){ //base64 encoded image
            var img = createElement('img');
            img.onload = function() {
                var img = this;

                var canvas = createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resize(canvas);
            };
            img.src = obj;
        }
        else{ //HTMLCanvasElement
            resize(obj);
        }
    };



  //**************************************************************************
  //** createMenuButton
  //**************************************************************************
    var createMenuButton = function(nodeType, icon, title){


      //Create button
        var btn = new javaxt.dhtml.Button(menubar, {
            display: "table",
            disabled: true,
            style: {
                button: "drawflow-toolbar-button",
                select: "drawflow-toolbar-button-selected",
                hover: "drawflow-toolbar-button-hover",
                label: "drawflow-toolbar-button-label",
                icon: "drawflow-toolbar-button-icon " + icon
            }
        });


      //Add drawflow specific properties
        btn.el.dataset["node"] = nodeType;
        btn.el.dataset["icon"] = icon;
        btn.el.dataset["title"] = title;
        btn.el.draggable = true;
        btn.el.ondragstart = function(e){
            if (btn.isDisabled()){
                //e.preventDefault();
                return false;
            }
            drag(e);
        };



      //Add tooltip
        btn.el.onmouseover = function(e){
            var button = this;
            if (tooltipTimer) clearTimeout(tooltipTimer);
            if (btn.isEnabled()){

                var showToolTip = function(){
                    var nodeType = button.dataset["node"];
                    var title = button.dataset["title"];
                    var label = "Add " + (title==null ? nodeType : title);
                    tooltip.getInnerDiv().innerHTML = label;
                    var rect = javaxt.dhtml.utils.getRect(button);
                    var rect2 = javaxt.dhtml.utils.getRect(button.parentNode);
                    var x = rect2.x + rect2.width + 3;
                    var y = rect.y + Math.ceil(rect.height/2);
                    tooltip.showAt(x, y, "right", "center");
                    lastToolTipEvent = new Date().getTime();
                };

                var delay = false; //disable delay for now...
                if (lastToolTipEvent){
                    if (new Date().getTime()-lastToolTipEvent<3000) delay = false;
                }
                if (delay){
                    tooltipTimer = setTimeout(showToolTip, 1000);
                }
                else{
                    showToolTip();
                }
            }
        };
        btn.el.onmouseleave = function(){
            tooltip.hide();
        };
        btn.el.onmousedown=function(){
            tooltip.hide();
        };


        button[nodeType] = btn;
        return btn;
    };


  //**************************************************************************
  //** addExtension
  //**************************************************************************
    var addExtension = function(extension){
        if (extension.type==="editor" && extension.node){
            addEditor(extension.node);
        }
    };


  //**************************************************************************
  //** addEditor
  //**************************************************************************
    var addEditor = function(node){

        var hasNode = false;
        config.nodes.forEach(function(n){
            if (n.type===node.type){
                hasNode = true;
            }
        });

        if (!hasNode){
            if (node.editor.class){
                config.nodes.push(node);
            }
            else{
                console.log("Failed to load " + node.title);
                return;
            }
        }


        if (!button[node.type]){
            createMenuButton(node.type, node.icon, node.title);
        }
    };


  //**************************************************************************
  //** getFileExtension
  //**************************************************************************
    var getFileExtension = function(file){
        var fileName = file.name.toLowerCase();
        var ext = fileName.substring(fileName.lastIndexOf(".")+1);
        return ext;
    };


  //**************************************************************************
  //** isValidFile
  //**************************************************************************
    var isValidFile = function(f){
        var ext;
        if (typeof f === "string"){
            ext = f;
        }
        else{
            ext = getFileExtension(f);
        }

        var foundMatch = false;
        for (var i=0; i<config.supportedFileTypes.length; i++){
            if (config.supportedFileTypes[i]===ext){
                foundMatch = true;
                break;
            }
        }

        return foundMatch;
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var onRender = javaxt.dhtml.utils.onRender;
    var isDirty = javaxt.dhtml.utils.isDirty;
    var isArray = javaxt.dhtml.utils.isArray;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var createElement = javaxt.dhtml.utils.createElement;
    var resizeCanvas = bluewave.utils.resizeCanvas;

    init();
};