if(!bluewave) var bluewave={};
if(!bluewave.editor) bluewave.editor={};

//******************************************************************************
//**  CsvEditor
//******************************************************************************
/**
 *   Panel used to view/edit CSV data
 *
 ******************************************************************************/

bluewave.editor.CsvEditor = function(parent, config) {

    var me = this;
    var defaultConfig = {};
    var chartConfig = {};
    var toolbar, gridContainer;



  //**************************************************************************
  //** Constructor
  //**************************************************************************
    var init = function(){

        if (!config) config = {};
        config = merge(config, defaultConfig);

        var table = createTable(parent);
        createToolbar(table.addRow().addColumn());
        gridContainer = table.addRow().addColumn();
        gridContainer.style.height = "100%";

        me.el = table;
    };


  //**************************************************************************
  //** update
  //**************************************************************************
    this.update = function(node){
        me.clear();

        if (!node.csv && node.file){

            var file = node.file;
            var fileName = file.name.toLowerCase();
            var idx = fileName.lastIndexOf(".");
            if (idx>-1){
                var ext = fileName.substring(idx+1);
                if (ext==='csv'){
                    var reader = new FileReader();
                    reader.onload = (function(f) {
                        return function(e) {
                            var data = e.target.result;
                            node.csv = data;
                            render(node.csv);
                        };
                    })(file);
                    reader.readAsText(file);
                }
            }
        }
        else{
            render(node.csv);
        }

    };


  //**************************************************************************
  //** clear
  //**************************************************************************
    this.clear = function(){
        gridContainer.innerHTML = "";
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
//        return previewArea;
    };


  //**************************************************************************
  //** renderChart
  //**************************************************************************
  /** Used to render a bar chart in a given dom element using the current
   *  chart config and data
   */
    this.renderChart = function(parent){
//        var chart = new bluewave.charts.BarChart(parent, {});
//        chart.update(chartConfig, inputData);
//        return chart;
    };


  //**************************************************************************
  //** createToolbar
  //**************************************************************************
    var createToolbar = function(parent){

    };


  //**************************************************************************
  //** render
  //**************************************************************************
    var render = function(csv){
        if (!csv) return;


        var data = [];
        if (typeof csv === "string"){
            data = d3.csvParse(csv);
        }

        if (data.length===0) return;


        var columns = Object.keys(data[0]);
        var rows = [];
        data.forEach((d)=>{
            var row = [];
            columns.forEach((column)=>{
                row.push(d[column]);
            });
            rows.push(row);
        });

        createGrid(rows, columns, gridContainer, config);
    };


  //**************************************************************************
  //** Utils
  //**************************************************************************
    var merge = javaxt.dhtml.utils.merge;
    var createTable = javaxt.dhtml.utils.createTable;
    var createGrid = bluewave.utils.createGrid;

    init();
};