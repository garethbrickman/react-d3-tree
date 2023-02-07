import './custom-tree.css';
import { useCenteredTree } from "./helpers";

import React, {useMemo,useState} from "react";

import Tree from "react-d3-tree";

import { client, useConfig, useElementColumns, useElementData } from "@sigmacomputing/plugin";

/*
const test = {
    name: "world",
    children: [
        {
            name: "north america",
            children: [
                {
                    name: "USA",
                    attributes: {
                        pop: 310
                    }
                },
                {
                    name: "Mexico",
                    attributes: {
                        pop: 100
                    }
                },
                {
                    name: "Canada",
                    attributes: {
                        pop: 50
                    }
                }
            ]
        },
        {
            name: "Asia",
            color: "hsl(102, 70%, 50%)",
            children: [
                {
                    name: "India",
                    attributes: {
                        pop: 2000
                    }
                },
                {
                    name: "China",
                    attributes: {
                        pop: 2000
                    }
                },
                {
                    name: "Pakistan",
                    attributes: {
                        pop: 50
                    }
                }
            ]
        }
    ]
};

*/

client.config.configureEditorPanel([
    { name: "source", type: "element" },
    { name: "dimension", type: "column", source: "source", allowMultiple: true },
    { name: "measure", type: "column", source: "source", allowMultiple: false },
    //{ name: 'orientation', type: 'text', defaultValue: 'horizontal'}
])

function sigmaDataToJson(data, colInfo, dimension, measure) {

    if (dimension.length && Object.keys(data).length && measure) {

        const lowestDimension = dimension[dimension.length - 1];
        const lowestDimensionData = data[lowestDimension];

        // loop through all dimensions
        // dimensionMap is a map whose entries are themselves maps, each with a key = the name of the dimension column
        const dimensionsMap = new Map();
        for (let j = 0; j < dimension.length; j++) {
            dimensionsMap.set(colInfo[dimension[j]].name, new Map());
        }

        // index i loops through each value for the lowest dimension
        for (let i = 0; i < lowestDimensionData.length; i++) {

            // index j loops through each dimension, starting from the lowest dimension
            for (let j = dimension.length - 1; j >= 0; j--) {

                if (j === dimension.length - 1) {
                    buildLowestDimension(data[dimension[j]][i], dimensionsMap.get(colInfo[dimension[j]].name), data[measure][i]);
                } else {
                    buildHigherDimensions(data[dimension[j]][i], dimensionsMap.get(colInfo[dimension[j]].name), dimensionsMap.get(colInfo[dimension[j+1]].name).get(data[dimension[j+1]][i]), data[measure][i]);
                }
            }

        }

        const buckets = Object.fromEntries(dimensionsMap.get(colInfo[dimension[0]].name));

        return Object.entries(buckets).map(([bucketKey, bucketData]) => (
            bucketData
        ))

    }
}

function buildLowestDimension(lowestDimensionValue, lowestDimensionMap, measureValue) {
    if (lowestDimensionMap.has(lowestDimensionValue)) {
        lowestDimensionMap.get(lowestDimensionValue).loc = lowestDimensionMap.get(lowestDimensionValue).loc + measureValue;
    } else {
        lowestDimensionMap.set(lowestDimensionValue, {name: lowestDimensionValue, attributes: {loc: measureValue}, loc: measureValue});
    }
}

function buildHigherDimensions(currentDimensionValue, currentDimensionMap, lowerDimensionObject, measureValue) {

    if (currentDimensionMap.has(currentDimensionValue)) {
        currentDimensionMap.get(currentDimensionValue).loc = currentDimensionMap.get(currentDimensionValue).loc + measureValue;
        currentDimensionMap.get(currentDimensionValue).children.push(lowerDimensionObject);
    } else {
        currentDimensionMap.set(currentDimensionValue, {name: currentDimensionValue, children: [lowerDimensionObject], attributes: {loc: measureValue}, loc: measureValue});
    }
}

const getDynamicPathClass = ({ source, target }, orientation) => {
    if (!source.parent) {
        // source node has no parent -> this is a root node.
        return 'link__from-root';
    }

    // style it as a link connecting two branch nodes by default.
    return 'link__from-branch';
};

const foreignObjectProps = { width: 200, height: 200, x: 20 };

const renderForeignObjectNode = ({ nodeDatum, toggleNode, foreignObjectProps }) => (
    <g className={nodeDatum.__rd3t.depth === 0 ? "node__root" : nodeDatum.children ? "node__branch" : "node__leaf"}>
        <circle
            r={15}
            onClick={evt => {
                //console.log(nodeDatum);
                toggleNode();
            }}>
        </circle>
        <foreignObject {...foreignObjectProps}>
            <div style={{color: "white"}}>{nodeDatum.name}</div>
            <div style={{color: "white"}}>{nodeDatum.loc ? Number(nodeDatum.loc).toLocaleString() : ""}</div>
        </foreignObject>
    </g>
);

const nodeSize = { x: 200, y: 100 };

const controlStyles = { fontSize: 10, paddingBottom: 10};

const MyTree = ({ data, translate, orientation}) => (
    <Tree
        data={data}
        orientation={orientation}
        pathClassFunc={getDynamicPathClass}
        shouldCollapseNeighborNodes={true}
        translate={translate}
        nodeSize={nodeSize}
        initialDepth={1}
        renderCustomNodeElement={(rd3tProps) =>
            renderForeignObjectNode({ ...rd3tProps, foreignObjectProps })
        }
    />
);

function App() {

    const config = useConfig();
    const columns = useElementColumns(config.source);
    const sigmaData = useElementData(config.source);

    const data = useMemo( () => {

        const dimension = config.dimension ?? [];
        const measure = config.measure;

        return {
                name: "world",
                children: sigmaDataToJson(sigmaData, columns, dimension, measure)
            };

    }, [columns, config.dimension, config.measure, sigmaData]);

    const [treeOrientation, setTreeOrientation] = useState('horizontal');

    const [translate, containerRef] = useCenteredTree();

    if (data) {
        return (
            <div>
                <div style={controlStyles}>
                    <label>Orientation:</label>&nbsp;
                    <select
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setTreeOrientation(e.target.value)}
                        value={treeOrientation}>
                        <option value="vertical">vertical</option>
                        <option value="horizontal">horizontal</option>
                    </select>
                </div>
                <div style={{ width: "100vw", height: "100vh", margin: "auto", backgroundColor: "#272b4d" }} ref={containerRef}>
                    <MyTree
                        data={data}
                        translate={translate}
                        orientation={treeOrientation}
                    />
                </div>
            </div>
        );
    } else {
        return null;
    }

}

export default App;
