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



        toolbar: {
            nodes: [
                "sankeyChart",
                "pieChart", "barChart", "lineChart",
                "histogramChart", "scatterChart",
                "mapChart", "treeMapChart", "calendarChart",
                "filter"
            ]
        },



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

        supportedFileTypes: [
            "csv", "tab", "tsv", "xls", "xlsx", "pdf"
        ]
    };

    var dashboardPanel, editPanel, toggleButton, mask, waitmask; //primary components
    var id, name, thumbnail; //dashboard attributes
    var menubar, button = {};
    var tooltip, tooltipTimer, lastToolTipEvent; //tooltip
    var drawflow, nodes = {}; //drawflow
    var windows = [];
    var zoom = 0;


  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){


      //Process config
        me.setConfig(config);
        if (!config.fx) config.fx = new javaxt.dhtml.Effects();
        if (!config.style) config.style = javaxt.dhtml.style.default;
        waitmask = config.waitmask;
        if (!waitmask) waitmask = {
            show: function(){},
            hide: function(){}
        };


      //Create main panel
        var div = document.createElement("div");
        div.setAttribute("desc", me.className);
        div.style.height = "100%";
        div.style.position = "relative";
        //div.style.overflow = "hidden";


      //Add toggle button
        createToggleButton(div);
        toggleButton.hide();


      //Add add mask
        createMask(div);


      //Create inner div for overflow purposes
        var innerDiv = document.createElement("div");
        innerDiv.style.width = "100%";
        innerDiv.style.height = "100%";
        innerDiv.style.position = "absolute";
        div.appendChild(innerDiv);


      //Create dashboard panel
        dashboardPanel = createDashboard(innerDiv);
        dashboardPanel.setAttribute("desc", "dashboardPanel");
        dashboardPanel.hide();


      //Create editor
        editPanel = document.createElement("div");
        editPanel.setAttribute("desc", "editPanel");
        editPanel.style.height = "100%";
        editPanel.onwheel = function(e){
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
        editPanel.tabIndex = -1;
        createEditPanel(editPanel);
        addShowHide(editPanel);
        innerDiv.appendChild(editPanel);



        parent.appendChild(div);
        me.el = div;
        addShowHide(me);
        addResizeListener(div, updateLayout);
    };


  //**************************************************************************
  //** setConfig
  //**************************************************************************
    this.setConfig = function(chartConfig){
        if (!chartConfig) config = defaultConfig;
        else config = merge(chartConfig, defaultConfig);
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
  //** getDashboardID
  //**************************************************************************
    this.getDashboardID = function(){
        return id;
    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){

      //Clear dashboard panel
        dashboardPanel.clear();

      //Reset class variables
        id = name = thumbnail = null;
        nodes = {};

      //Clear drawflow
        drawflow.clear();

      //Reset buttons
        for (var buttonName in button) {
            if (button.hasOwnProperty(buttonName)){
                button[buttonName].disable();
            }
        }

      //Reset toggleButton
        toggleButton.reset();


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
   *  @param dashboard Json with dashboard info
   *  @param readOnly If true, prevent user from editing
   *  @param view Preferred view ("Edit", "Preview", or "Dashboard")
   */
    this.update = function(dashboard, readOnly, view){


      //Process args
        if (!dashboard) dashboard = {};
        if (!(readOnly===true || readOnly===false)) readOnly = false;
        if (!(view==="Edit" || view==="Preview" || view==="Dashboard")) view="Edit";



      //Show mask
        mask.show();


      //Reset panels and class variables
        me.clear();


      //Ensure that the chartEditor is visible (albeit hidden by the mask).
      //Otherwise, the thumbnail previews might not generate correctly
        toggleButton.setValue("Edit");


      //Show/hide the toggleButton as needed
        if (view==="Dashboard"){
            toggleButton.hide();
        }
        else{
            toggleButton.show();
            mask.hide();
        }


      //Update class variables
        id = dashboard.id;
        name = dashboard.name;
        thumbnail = dashboard.thumbnail;


      //Set view mode
        drawflow.editor_mode = readOnly ? "view" : "edit";


      //Update buttons
        updateButtons();


      //Set mouse focus
        editPanel.focus();


      //Return early if the dashboard is missing config info
        if (!dashboard.info) return;


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
                var temp = document.createElement("div");
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


        var onReady = function(){
            updateButtons();
            me.setView(view);
            setTimeout(function(){
                if (me.getView()!=="Dashboard"){

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
                }

                mask.hide();
                editPanel.focus();

            },500); //slight delay for drawflow
        };


        onReady();
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


      //Enable database node
        if (button.database) button.database.enable();


      //Generate a unique list of visible node types
        var visibleNodes = {};
        var hasVisibleNodes = false;
        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                visibleNodes[node.type] = true;
                hasVisibleNodes = true;
            }
        }


      //Enable buttons based on what nodes are in the canvas
        config.nodes.forEach(function(n){
            var menuButton = button[n.type];
            if (!menuButton) return;

            var inputNodes = n.inputNodes;
            if (inputNodes){
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
  //** setView
  //**************************************************************************
  /** */
    this.setView = function(name){
        if (!name) name = "Edit";
        if (name==="Edit"){

            if (me.getView()==="Dashboard"){
                var dashboard = getDashboard(name);
                me.update(dashboard, false, "Edit");
            }
            else{
                toggleButton.setValue("Edit");
                toggleButton.show();
            }
        }
        else if (name==="Preview"){
            toggleButton.show();
            toggleButton.setValue("Preview");
        }
        else if (name==="Dashboard"){
            toggleButton.show();


            if (getLayoutNode()){
                toggleButton.hide();
                toggleButton.setValue("Preview");
            }
            else{
                toggleButton.setValue("Edit");
            }
        }
    };


  //**************************************************************************
  //** getView
  //**************************************************************************
    this.getView = function(){
        var name = toggleButton.getValue();
        if (name==="Preview"){
            if (!toggleButton.isVisible()) name = "Dashboard";
        }
        return name;
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
    this.isReadOnly = function(){
        return (drawflow.editor_mode==="view");
    };



  //**************************************************************************
  //** getDashboard
  //**************************************************************************
    var getDashboard = function(name){
        var dashboard = {
            id: id,
            name: name,
            className: me.className,
            //thumbnail: thumbnail,
            info: {
                layout: drawflow.export().drawflow.Home.data,
                nodes: {},
                zoom: zoom
            }
        };


        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                dashboard.info.nodes[key] = {
                    name: node.name,
                    type: node.type,
                    config: node.config,
                    preview: node.preview
                };
            }
        };
        return dashboard;
    };


  //**************************************************************************
  //** getLayoutNode
  //**************************************************************************
  /** Returns the first layout node
   */
    var getLayoutNode = function(){
        for (var key in nodes) {
            if (nodes.hasOwnProperty(key)){
                var node = nodes[key];
                if (node.type==="layout"){
                    return node;
                }
            }
        }
        return null;
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
  //** createEditPanel
  //**************************************************************************
    var createEditPanel = function(parent){

      //Create drawflow
        createDrawFlow(parent);


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

    };


  //**************************************************************************
  //** createDrawFlow
  //**************************************************************************
    var createDrawFlow = function(parent){

        var div = document.createElement("div");
        div.className = "drawflow";
        div.addEventListener('dragover', onDragOver, false);
        div.addEventListener('drop', onDrop, false);
        parent.appendChild(div);


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

        });
        drawflow.on('nodeRemoved', function(nodeID) {
            removeInputs(nodes, nodeID);
            var nodeType = nodes[nodeID+""].type;
            delete nodes[nodeID+""];
            if (nodeType==="layout" && !getLayoutNode()) toggleButton.hide();
            updateButtons();
        });
        drawflow.on('connectionRemoved', function(info) {
            var outputID = info.output_id+"";
            var inputID = info.input_id+"";
            var node = nodes[inputID];
            delete node.inputs[outputID+""];
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
                            deleteDiv = document.createElement("div");
                            deleteDiv.className = "drawflow-delete2";
                            parentNode.appendChild(deleteDiv);
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


      //Create toolbar
        menubar = document.createElement("div");
        menubar.className = "drawflow-toolbar";
        div.appendChild(menubar);



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
                waitmask.show(500);


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


              //Upload files to the server
                var uploads = 0;
                var failures = [];
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




      //Create icon
        var i = document.createElement("i");
        i.className = icon;


//      //Update buttons
//        button["save"].enable();
//        if (id){
//            button["edit"].enable();
//            button["delete"].enable();
//        }

        var inputs = 0;
        var outputs = 1;

        if (nodeConfig.inputNodes){
            if (isArray(nodeConfig.inputNodes)){
                if (nodeConfig.inputNodes.length>0) inputs = 1;
            }
        }


        if (nodeType==="layout") outputs = 0;

      //Create node
        var node = createNode({
            name: title,
            type: nodeType,
            icon: icon,
            content: i,
            position: [pos_x, pos_y],
            inputs: inputs,
            outputs: outputs
        });

        addEventListeners(node);



      //Special case for files
        if (file){

          //Instantiage node editor with the file
            node.file = file;
            node.config.fileName = file.name;
            var editor = getNodeEditor(node);
            if (editor) editor.show();

        }
    };


  //**************************************************************************
  //** addEventListeners
  //**************************************************************************
    var addEventListeners = function(node){
        node.ondblclick = function(){
            var editor = getNodeEditor(node);
            if (editor){
                editor.show();
            }
        };
    };


  //**************************************************************************
  //** createNode
  //**************************************************************************
    var createNode = function(node){
        var div = document.createElement("div");
        div.id = "_"+new Date().getTime();
        var title = document.createElement("div");
        title.className = "drawflow-node-title";
        title.innerHTML = "<i class=\"" + node.icon + "\"></i><span>" + node.name + "</span>";
        div.appendChild(title);
        var body = document.createElement("div");
        body.className = "drawflow-node-body";
        var content = node.content;
        if (content){
            if (typeof content === "string"){
                body.innerHTML = content;
            }
            else{
                body.appendChild(content);
            }
        }
        div.appendChild(body);


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

            var save = function(){
                if (me.isReadOnly()) return;

                var chartConfig = editor.getConfig();
                var node = editor.getNode();
                node.config = chartConfig;
                me.save();

                //TODO: Update thumbnail?
            };


          //Automatically update dashboard whenever the editor is updated
            editor.onSave = function(){
                save();
            };

            editor.onChange = function(){
                if (isNaN(id)) return;
                save();
            };

        }


      //Add custom getNode
        editor.getNode = function(){
            return node;
        };


      //Update editor
        editor.update(node);

        return editor;
    };


  //**************************************************************************
  //** createNodeEditor
  //**************************************************************************
    var createNodeEditor = function(conf){

        merge(conf, {
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
            title: conf.title,
            width: conf.width,
            height: conf.height,
            modal: true,
            resizable: conf.resizable,
            shrinkToFit: true,
            style: style,
            renderers: {

              //Create custom renderer for the close button. Basically, we
              //want to delay closing the window until after the thumbnail
              //is created
                headerButtons: function(buttonDiv){
                    var btn = document.createElement('div');
                    setStyle(btn, style.button);
                    var icon = document.createElement('div');
                    setStyle(icon, style.closeIcon);
                    btn.appendChild(icon);
                    btn.onclick = function(){
                        if (conf.beforeClose){
                            conf.beforeClose.apply(me, [win]);
                        }
                        else{
                            //win.close();
                            var editor = win.editor;
                            var node = editor.getNode();
                            if (editor.getData) node.data = editor.getData();
                            var chartConfig = editor.getConfig();
                            var orgConfig = node.config;
                            if (!orgConfig) orgConfig = {};
                            if (isDirty(chartConfig, orgConfig)){
                                node.config = chartConfig;
                                updateTitle(node, node.config.chartTitle);
                                waitmask.show();
                                if (editor.getChart){
                                    var el = editor.getChart();
                                    if (el.show) el.show();
                                    setTimeout(function(){
                                        createPreview(el, function(canvas){
                                            if (canvas && canvas.toDataURL){
                                                node.preview = canvas.toDataURL("image/png");
                                                createThumbnail(node, canvas);
                                            }
                                            win.close();
                                            waitmask.hide();
                                        }, this);
                                    },800);
                                }
                            }
                            else{
                                updateTitle(node, node.config.chartTitle);
                                win.close();
                            }
                            if (button.layout) button.layout.enable();
                        }
                    };
                    buttonDiv.appendChild(btn);
                }
            }
        });


        if (conf.class){
            if (typeof conf.class === "string"){
                conf.class = eval(conf.class);
            }

            var editor = new conf.class(win.getBody(), conf);

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
        else{ //Special case for dbView
            return win;
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

        var div = document.createElement('div');
        div.style.width = "100%";
        div.style.height = "100%";
        el.appendChild(div);
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

            var img = document.createElement('img');
            img.className = "noselect";
            img.onload = function() {
                el.appendChild(this);
            };
            img.src = base64image;
            img.ondragstart = function(e){
                e.preventDefault();
            };

        };


        if (typeof obj === "string"){ //base64 encoded image
            var img = document.createElement('img');
            img.onload = function() {
                var img = this;

                var canvas = document.createElement('canvas');
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
  //** checkConnection
  //**************************************************************************
    var checkConnection = function(layoutNode, node){
        var connected = false;
        for (var inputID in layoutNode.inputs){
            var tempNode = nodes[inputID];
            if (tempNode === node){
                connected = true;
            }
        }
        return connected;
    };


  //**************************************************************************
  //** updateLayout
  //**************************************************************************
  /** Used to update the size and position of all the dashboard items in the
   *  layout.
   */
    var updateLayout = function(){
        if (me.getView()!=="Edit"){
            dashboardPanel.resize();
            var dashboardItems = dashboardPanel.getDashboardItems();
            for (var i=0; i<dashboardItems.length; i++){
                var dashboardItem = dashboardItems[i];
                updateSVG(dashboardItem);
            }
        }
    };


  //**************************************************************************
  //** updateSVG
  //**************************************************************************
  /** Used to update the size and position of an individual dashboard item
   *  in s layout.
   */
    var updateSVG = function(dashboardItem){
        var svgs = dashboardItem.getElementsByTagName("svg");
        if (svgs.length>0){
            var svg = svgs[0];
            var chartContainer = svg.parentNode;
            var rect = javaxt.dhtml.utils.getRect(chartContainer.parentNode);


          //Update dimensions of the svg
            d3.select(svg)
            .attr("width",rect.width)
            .attr("height",rect.height);


          //Get attributes of the second "g" element in the svg. Assumes that
          //the first "g" element is reserved exclusively for us to manipulate
          //in this class. All chart types should have a outer "g" like this.
            var g = svg.getElementsByTagName("g")[0]; //reserved for explorer
            var g2 = g.getElementsByTagName("g")[0]; //used by individual charts
            var box = g2.getBBox();
            var width = box.width;
            var height = box.height;
            var scaleX = 1;
            var scaleY = 1;
            var translateX = 0;
            var translateY = 0;
            var transformList = g2.transform.baseVal;
            for (var i=0; i<transformList.numberOfItems; i++){
                var transform = transformList.getItem(i);
                var m = transform.matrix;
                switch (transform.type){
                  case 2:
                    translateX = m.e;
                    translateY = m.f;
                    break;
                  case 3:
                    scaleX = m.a;
                    scaleY = m.d;
                    break;
                }
            }



          //Compute scale
            var scale;
            var scaledWidth = (width)*scaleX;
            var scaledHeight = (height)*scaleY;
            if (width>=height){
                scale = rect.width/scaledWidth;
                var h = scaledHeight*scale;
                if (h>rect.height){
                    scale = rect.height/scaledHeight;
                }
            }
            else{
                scale = rect.height/scaledHeight;
                var w = scaledWidth*scale;
                if (w>rect.width){
                    scale = rect.width/scaledWidth;
                }
            }



          //Compute x/y offset
            var x = 0;
            var y = 0;
            if (translateX===0){ //center the chart
                x = (rect.width/2)-((scaledWidth*scale)/2);
            }
            else{
                //TODO: center chart using translateX
            }

            if (translateY===0){ //center the chart
                y = (rect.height/2)-((scaledHeight*scale)/2);
            }
            else{
                //TODO: center chart using translateY
            }


          //Apply transform to the first g
            d3.select(g).attr("transform",
                "translate(" + x + "," + y + ") " +
                "scale(" + scale + ")"
            );

        }
    };


  //**************************************************************************
  //** createDashboard
  //**************************************************************************
  /** Creates a panel used to render dashboard items
   */
    var createDashboard = function(parent){
        var outerDiv = document.createElement("div");
        outerDiv.style.height = "100%";
        outerDiv.style.textAlign = "center";
        parent.appendChild(outerDiv);
        addShowHide(outerDiv);


        var paddedDiv = document.createElement("div");
        paddedDiv.style.height = "100%";
        paddedDiv.style.position = "relative";
        paddedDiv.style.padding = "10px";
        paddedDiv.style.boxSizing = "border-box";
        paddedDiv.style.display = "inline-block";
        outerDiv.appendChild(paddedDiv);

        var innerDiv = document.createElement("div");
        innerDiv.style.position = "relative";
        innerDiv.style.width = "100%";
        innerDiv.style.height = "100%";
        paddedDiv.appendChild(innerDiv);



        var childNodes = [];
        var maxWidth = 0;
        var maxHeight = 0;
        outerDiv.add = function(el){
            innerDiv.appendChild(el);
            childNodes.push(el);
            maxWidth = Math.max(maxWidth, parseFloat(el.style.width)+parseFloat(el.style.left))/100;
            maxHeight = Math.max(maxHeight, parseFloat(el.style.height)+parseFloat(el.style.top))/100;
        };
        outerDiv.clear = function(){
            innerDiv.innerHTML = "";
            childNodes = [];
            maxWidth = 0;
            maxHeight = 0;
        };
        outerDiv.getDashboardItems = function(){
            return childNodes;
        };
        outerDiv.resize = function(){

            var width = outerDiv.offsetWidth;
            var height = outerDiv.offsetHeight;

            if (maxWidth===0 || maxHeight===0) return;

            var w, h;
            if (maxWidth>=maxHeight){
                w = width;
                h = w;

                if (height<h*maxHeight){
                    var d = height/(h*maxHeight);
                    w = w*d;
                    h = w;
                }
            }
            else{
                h = height;
                w = h;

                if (width<w*maxWidth){
                    var d = width/(w*maxWidth);
                    h = h*d;
                    w = h;
                }
            }

            paddedDiv.style.width = w + "px";
            paddedDiv.style.height = h + "px";
        };

        return outerDiv;
    };


  //**************************************************************************
  //** updateDashboard
  //**************************************************************************
  /** Used to render/update a complete dashboard (collection of charts in a
   *  layout)
   */
    var updateDashboard = function(){

      //Find layout node
        var layoutNode = getLayoutNode();
        if (!layoutNode) return;


      //TODO: Check if layout is dirty
        var isDirty = true;
        if (!isDirty) return;


      //Clear and resize the dashboardPanel
        dashboardPanel.clear();



      //Render dashboard items
        for (var key in layoutNode.config) {
            if (layoutNode.config.hasOwnProperty(key)){


                var layout = layoutNode.config[key];
                var node = nodes[key];
                var connected = checkConnection(layoutNode, node);
                if (!connected) continue;
                if (!node) continue;
                var chartConfig = node.config;
                if (!chartConfig) chartConfig = {};
                var title = chartConfig.chartTitle;


              //Create absolute div for the dashboard item
                var outerDiv = document.createElement("div");
                outerDiv.style.position = "absolute";
                outerDiv.style.width = layout.width;
                outerDiv.style.height = layout.height;
                outerDiv.style.top = layout.top;
                outerDiv.style.left = layout.left;
                dashboardPanel.add(outerDiv);
                dashboardPanel.resize();


              //Create an inner div for padding purposes
                var innerDiv = document.createElement("div");
                innerDiv.style.width = "100%";
                innerDiv.style.height = "100%";
                innerDiv.style.padding = "10px";
                innerDiv.style.boxSizing = "border-box";
                outerDiv.appendChild(innerDiv);


              //Create dashboard item
                var dashboardItem = createDashboardItem(innerDiv,{
                    title: title,
                    subtitle: "",
                    width: "100%",
                    height: "100%"
                });


              //Update default style. Remove padding and margin because the
              //inner div handles that.
                var div = dashboardItem.el;
                div.style.padding = "0px";
                div.style.margin = "0px";


              //Function used to create a overflow container for charts
                var createChartContainer = function(){
                    var innerDiv = dashboardItem.innerDiv;
                    var chartContainer = document.createElement("div");
                    chartContainer.style.position = "absolute";
                    chartContainer.style.top = 0;
                    innerDiv.style.overflow = "hidden";
                    chartContainer.style.width = layout.imageWidth + "px";
                    chartContainer.style.height = layout.imageHeight + "px";
                    innerDiv.appendChild(chartContainer);
                    return chartContainer;
                };


                onRender(dashboardItem.innerDiv, function(){

                    var editor = getNodeEditor(node);
                    if (editor){
                        if (editor.renderChart){
                            editor.renderChart(createChartContainer());
                        }
                    }

                    updateSVG(div);

                });
            }
        }


      //Some charts take a little longer to render so update again just in case
        setTimeout(updateLayout,800);
    };


  //**************************************************************************
  //** createToggleButton
  //**************************************************************************
    var createToggleButton = function(parent){

        var div = document.createElement("div");
        div.setAttribute("desc", "toggleButton");
        div.style.position = "absolute";
        div.style.top = "60px";
        div.style.right = "20px";
        div.style.zIndex = 2;
        parent.appendChild(div);


        var options = ["Edit","Preview"];
        toggleButton = bluewave.utils.createToggleButton(div, {
            options: options,
            //defaultValue: options[0],
            onChange: function(val){
                if (val==="Edit"){
                    dashboardPanel.hide();
                    editPanel.show();
                    editPanel.focus();
                }
                else{
                    editPanel.hide();
                    dashboardPanel.show();
                    updateDashboard();
                }
            }
        });
        addShowHide(toggleButton);
        toggleButton._show = toggleButton.show;
        toggleButton.show = function(){
            if (getLayoutNode()) this._show();
            else this.hide();
        };
    };


  //**************************************************************************
  //** createMask
  //**************************************************************************
    var createMask = function(parent){
        var div = document.createElement("div");
        div.setAttribute("desc", "mask");
        div.style.position = "absolute";
        div.style.zIndex = 3;
        div.style.top = "0px";
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.backgroundColor = "#f5f5f5"; //maybe put this in main.css?
        addShowHide(div);
        div.hide();
        parent.appendChild(div);
        mask = div;
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
    var setStyle = javaxt.dhtml.utils.setStyle;
    var addShowHide = javaxt.dhtml.utils.addShowHide;
    var addResizeListener = javaxt.dhtml.utils.addResizeListener;

    var resizeCanvas = bluewave.utils.resizeCanvas;
    var createDashboardItem = bluewave.utils.createDashboardItem;

    init();
};