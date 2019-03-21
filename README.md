# Walkers Custom Visual For Power BI

_An animated pictographic bar chart for building visually appealing Power BI reports._

![Preview](./demo/filter-example.gif)

## How to use

For examples on how to use please refer to the sample report in the demo folder names `Walkers-Custom-Visual-Demo.pbix` It demonstrates the visual and its various usecases and configuration setups. Note that most of the editing features are present in the edit mode tucked under the visual header.

## Build Process
This visual features a two phase build process for easy debugging, i.e. we first build the visual as a web component and create a `bundle.js` and in the second phase we build the Power BI visual in the `PBI` folder.

```
git clone https://github.com/wishyoulization/PowerBI-visuals-Walkers.git
cd PowerBI-visuals-Walkers
npm install
cd PBI
npm install
npm run-script package
```

When developing locally in a browser.
```
cd PowerBI-visuals-Walkers
npm run-script start
```

When developing locally for PowerBI debugger (Please refer to the Power BI Custom Visual Development Guide for more details on how to setup build tools).
```
cd PowerBI-visuals-Walkers
cd PBI
npm run-script start
```
