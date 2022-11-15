# Introduction
The bluewave-explorer library is a data visualization framework used to create charts and graphs from tabular data.

## General Usage
The bluewave-explorer component is instantiated using a parent and a config object. The parent is a DOM element in 
which to render the component and the config object is a JSON object with configuration settings.


```javascript
//Select element used hold the component
var parent = document.body;

//Define config settings (optional)
var config = {
    //put config options here
};

//Instantiate component
var explorer = new bluewave.Explorer(parent, config);

//Call public methods
explorer.update();
```


## Dependencies
All dependencies are found in the `demo/lib` folder. These include:
 - D3 (v6)
   -  [d3.v6](https://github.com/d3/d3)
   -  [d3-sankey](https://github.com/d3/d3-sankey)
   -  [d3-voronoi-map](https://github.com/Kcnarf/d3-voronoi-treemap)
   -  [d3-voronoi-treemap](https://github.com/Kcnarf/d3-voronoi-treemap)
   -  [d3-weighted-voronoi](https://github.com/Kcnarf/d3-voronoi-treemap)
   -  [topojson-client](https://github.com/topojson/topojson-client)
 - [Drawflow (0.0.40)](https://github.com/jerosoler/Drawflow)
 - [Bluewave Charts](https://github.com/BlueWaveTechnologies/bluewave-charts)
 - [JavaXT Webcontrols](https://github.com/javaxt-project/javaxt-webcontrols)
 - [Ala SQL](https://github.com/AlaSQL/alasql)
 - [Sheets](https://github.com/SheetJS/sheetjs)
 - [CodeMirror (v5)](https://codemirror.net/5/)
 - [Chroma](https://github.com/gka/chroma.js/)
 - [IRO](https://github.com/jaames/iro.js)
 - [html2canvas](https://github.com/niklasvh/html2canvas)
 - [Font Awesome (v5)](https://fontawesome.com/v5/download)


## History
This library is part of a prototype app originally developed for the FDA as part of a larger COVID-19 emergency response. 
We needed a dashboard builder to visualize massive amounts of data in a graph database (Neo4J) but at the time, there were 
no good dashboarding tools for Neo4J so rolled our own.

## License
BlueWave is an open source project released under an MIT License. Feel free to use the code and information found here as you like. 
This software comes with no guarantees or warranties. You may use this software in any open source or commercial project.
