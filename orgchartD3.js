//*** GLOBAL PARAMETERS ***//
var debug = true
var fixedOnly = false
var minXPadding = 0.25 // pct of node width
var maxHorizontalFreeNodes = 5
var maxVertFreeNodes = 9 

var svgParams = {
  "width": 1000,
  "height": 1000
}

var xScale = d3.scaleLinear()
.domain([0, 4000])
.range([0, 1000])

var yScale = d3.scaleLinear()
.domain([0, 2000])
.range([0, 800])

//*** FUNCTIONS ***//
function preprocess(data) {
  let nodesFixed = []
  let nodesFree = []
  let edgesFixed = []
  let edgesFree = []

  for(row of data) {
    if(row.col0 == "node") {
      let node = {
        color: "#DE7A22",
        type: row.col0,
        name: row.col1,
        width: xScale(+row.col2), 
        height: yScale(+row.col3), 
        x: row.col4,
        y: row.col5,
        sourceCount: 0,
        targetCount: 0
      }

      if(node.x != "") {
        node.x = xScale(+node.x) 
        node.y = yScale(+node.y) 
        nodesFixed.push(node)
      } else {
        node.color = "#2C7873"
        nodesFree.push(node)
      }
    }

    if(row.col0 == "edge") {
      let edge = {
        type: row.col0,
        source: row.col1,
        target: row.col2,
        points: []
      }

      // Update sourceCount and targetCount of nodes
      let sourceIndex = nodesFixed.findIndex((node) => { return node.name == edge.source })
      if(sourceIndex == -1) {
        sourceIndex = nodesFree.findIndex((node) => { return node.name == edge.source })
        nodesFree[sourceIndex].sourceCount++ 
      } else {
        nodesFixed[sourceIndex].sourceCount++
      }
      let targetIndex = nodesFixed.findIndex((node) => { return node.name == edge.target })
      if(targetIndex == -1) {
        let targetIndex = nodesFree.findIndex((node) => { return node.name == edge.target })
        nodesFree[targetIndex].targetCount++
      } else {
        nodesFixed[targetIndex].targetCount++
      }
    
      if(row.col3 != "") { // edge is not free
        for(let i=3; i < Object.keys(row).length; i+=2) {
          let xKey = "col"+i
          let yKey = "col"+(i+1)

          if(row[xKey] != "") { // if the current xKey is not empty
            xVal = xScale(+row[xKey]) + 0.5*nodesFixed[0].width 
            yVal = yScale(+row[yKey]) + 0.5*nodesFixed[0].height
            edge.points.push([xVal, yVal])
          } else {
            break
          }
        }

        edgesFixed.push(edge)

      } else { // edge is free

        edgesFree.push(edge)
      }
    }
  }
  return [nodesFixed, nodesFree, edgesFixed, edgesFree]
}

function findMaxSourceTarget(nodes) {
  let sourceCountMax = nodes
    .map((node) => { return node.sourceCount })
    .sort((a, b) => { return b - a })[0]

  let targetCountMax = nodes
    .map((node) => { return node.targetCount })
    .sort((a, b) => { return b - a })[0]

  return [sourceCountMax, targetCountMax]
}

function findFreeChildren(edgesFree, nodesFree, parentIndex) {
  let freeChildren = []
  for(let edgeIndex = 0; edgeIndex < edgesFree.length; edgeIndex++) {
    if(edgesFree[edgeIndex].source == pNode.name) {
      let childIndex = nodesFree
        .findIndex((node) => { return node.name == edgesFree[edgeIndex].target })
      if(childIndex != -1) {
        freeChildren.push(
          { 
            index: childIndex,
            parentIndex: parentIndex,
            edgeIndex: edgeIndex,
            name: nodesFree[childIndex].name, 
            sourceCount: nodesFree[childIndex].sourceCount
          }
        )
      }
    }
  }
  
  return freeChildren
}

function spacer(x1, x2, numChildren) {
  let xVal = []
  let delta = x2 - x1
  let spacing = 1.2*delta/(numChildren+1)
  for(let i=0; i < numChildren; i++) {
    xVal.push(x1 + (i+1)*spacing)
  }
  return xVal
}

function updatePoints(pNode, cNode, isMoreThanOneDeep) {
  let points = []
  let yMid = pNode.y + pNode.height + (cNode.y - pNode.y - pNode.height)/2
  if(!isMoreThanOneDeep) {
    points.push([pNode.x + 0.5*pNode.width, pNode.y + pNode.height])
    points.push([pNode.x + 0.5*pNode.width, yMid])
    points.push([cNode.x + 0.5*pNode.width, yMid])
    points.push([cNode.x + 0.5*pNode.width, cNode.y])
  } else {
    points.push([pNode.x + 0.5*pNode.width, pNode.y + pNode.height])
    points.push([pNode.x + 0.5*pNode.width, cNode.y + 0.5*pNode.height])
    if(cNode.x > pNode.x) {
      points.push([cNode.x, cNode.y + 0.5*pNode.height])
    } else {
      points.push([cNode.x + cNode.width, cNode.y + 0.5*pNode.height])
    }
  }
  return points
}

function placeFreeNodes(pNode, cNodes, depthOfOneLayer) {
  let pos = []
  
  if(cNodes.length == 1) {
    let coord = {
      x: pNode.x,
      y: pNode.y + depthOfOneLayer
    }
    pos.push(coord)
  } else if(cNodes.length <= maxHorizontalFreeNodes) {
    for(let i=0; i < cNodes.length; i++) {
      let coord = {
        x: pNode.x + i*(pNode.width + 2*minXPadding*pNode.width),
        y: pNode.y + depthOfOneLayer
      }
      pos.push(coord)
    }
    let totWidth = pos[pos.length - 1].x - pos[0].x 
    for(let i=0; i < pos.length; i++) {
      pos[i].x = pos[i].x - 0.5*totWidth
    }
  } else {
    for(let i=0; i < cNodes.length; i++) {
      let x = pNode.x + 0.5*pNode.width
      if(i < maxVertFreeNodes) {
        x = x - pNode.width - minXPadding*pNode.width
      } else {
        x = x + minXPadding*pNode.width
      }

      let l = (i+1)%maxVertFreeNodes
      if(l == 0) { l = maxVertFreeNodes }
      let y = pNode.y + l*depthOfOneLayer

      pos.push({x: x, y: y})
    }
  }

  return pos
}

//*** LOAD AND DRAW DIRECTED TREE ***//
var svg = d3.select("body")
  .append("svg:svg")
  .attr("width", svgParams.width)
  .attr("height", svgParams.height)
  .append("svg:g")

d3.csv("orgchart.csv", function(error, data){
  if(error) { throw error }
  
  data = preprocess(data)
  let nodesFixed = data[0]
  let nodesFree = data[1]
  let edgesFixed = data[2]
  let edgesFree = data[3]

  // Print max source/target count
  let maxSourceTarget = findMaxSourceTarget(nodesFixed.concat(nodesFree))
  let sourceCountMax = maxSourceTarget[0]
  let targetCountMax = maxSourceTarget[1]
  console.log("[maxSource, maxTarget] = [" + maxSourceTarget + "]")

  // Find all existing layers of depth (horizontal alignment)
  let layers = nodesFixed
    .map((node) => { return node.y }) // return array of all y values
    .filter((y, index, layers) => { return layers.indexOf(y) === index }) // only keep unique values
    .sort((a, b) => { return a - b }) // sort in ascending order

  // Iterate down each layer and draw free nodes for FIXED parent nodes
  for(let l=1; l < layers.length; l++) {
    let parentNodes = nodesFixed
      .filter((node) => { return node.y == layers[l] })
      .sort((a, b) => { return a.x - b.x}) // sort by left-most parent

    for(pNode of parentNodes) {
      // Find parent index
      let parentIndex = nodesFixed
        .findIndex((node) => { return node.name == pNode.name })
      
      // Store freeChildren information in an array
      let freeChildren = findFreeChildren(edgesFree, nodesFree, parentIndex)
      if(!(freeChildren.length > 0)) { continue }

      // Manual adjustments
      let swapList = [
        "O.T.HARVEY",
        "M.E.HUNT"
      ]
      for(let i=0; i < freeChildren.length; i++) {
        let found = swapList.findIndex((name) => { return name == freeChildren[i].name})
        if(found != -1) {
          let temp = freeChildren[i]
          freeChildren[i] = freeChildren[i-1]
          freeChildren[i-1] = temp
        }
      }

      // If there are any fixed edges, try to fit the child nodes along these edges
      let existingEdges = edgesFixed
        .filter((edge) => { return edge.source == pNode.name })

      if(existingEdges.length > 0) {
        let edgeMax = existingEdges[0]
        let pX = []
        for(edge of existingEdges) {
          pX.push(edge.points[edge.points.length - 1][0])
          if(edge.points[edge.points.length - 1][0] > edgeMax.points[edgeMax.points.length - 1][0]) { edgeMax = edge }
          if(edge.points[edge.points.length - 1][1] > edgeMax.points[edgeMax.points.length - 1][1]) { edgeMax = edge }
        }
        pX.sort((a,b) => { return a - b })

        let leftPos = 0
        let fitBetween = false
        for(let i=1; i < pX.length; i++) {
          fitBetween = (pX[i] - pX[i -1]) > (freeChildren.length*pNode.width*3)
          if(fitBetween) { break }
          leftPos = i 
        }

        let refNode = nodesFixed.find((node) => { return node.name == edgeMax.target})
        let cL = layers.indexOf(refNode.y)
        let pL = layers.indexOf(pNode.y)
        let xVal = refNode.x
        if(fitBetween) {
          xVal = spacer(pX[leftPos], pX[leftPos+1], freeChildren.length)
        }
        
        // Update edge points
        let i = 0
        for(child of freeChildren) {
          let cNode = nodesFree[child.index]
          let points = []
          if(cL == pL + 1) {
            if(fitBetween) {
              cNode.x = xVal[i] 
            } else if(xVal < pNode.x) {
              cNode.x = xVal + (i+1)*(pNode.width + 2*minXPadding*pNode.width)
            } else {
              cNode.x = xVal - (i+1)*(pNode.width + 2*minXPadding*pNode.width) 
            }
            cNode.y = layers[l + 1]
            points = updatePoints(pNode, cNode, false)
            edgesFree[child.edgeIndex].points = points
          } else {
            cL++
            cNode.x = refNode.x
            cNode.y = layers[cL]
            points = updatePoints(pNode, cNode, true)
            edgesFree[child.edgeIndex].points = points
          }
          nodesFree[child.index] = cNode
          i++
        } 
      } else {
        // No fixed edges
        let pos = placeFreeNodes(pNode, freeChildren, layers[1] - layers[0])
        if(freeChildren[0].name == "M.E.HUNT") {
          pos[0].x = pos[0].x - 0.3*pNode.width
          pos[1].x = pos[1].x + 0.3*pNode.width
        }
        for(let i=0; i < freeChildren.length; i++) {
          let childIndex = freeChildren[i].index
          nodesFree[childIndex].x = pos[i].x
          nodesFree[childIndex].y = pos[i].y
  
          // Update edge point
          let cNode = nodesFree[childIndex]
          if(freeChildren.length <= maxHorizontalFreeNodes) {
            points = updatePoints(pNode, cNode, false)
          } else {
            points = updatePoints(pNode, cNode, true) 
          }
          let edgeIndex = freeChildren[i].edgeIndex
          edgesFree[edgeIndex].points = points
        } 
      }
    }
  }

  // Iterate down each layer and draw free child nodes for FREE parent nodes
  for(let l=1; l < layers.length; l++) {
    let parentNodes = nodesFree
      .filter((node) => { return Math.abs(node.y - layers[l]) < 3 })
      .sort((a, b) => { return a.x - b.x}) // sort by left-most parent

    for(pNode of parentNodes) {
      // Find parent index
      let parentIndex = nodesFree
        .findIndex((node) => { return node.name == pNode.name })
      
      // Store freeChildren information in an array
      let freeChildren = findFreeChildren(edgesFree, nodesFree, parentIndex)
      if(!(freeChildren.length > 0)) { continue }

      // Sort children so that highest sourceCount is to the left
      freeChildren = freeChildren
        .sort((a, b) => { return b.sourceCount - a.sourceCount })

      // Manual adjustments
      let swapList = [
        "D.K.MCGREGOR",
        "L.I.BLUMKE",
        "E.N.SIMMONS",
        "K.C.CUNEO",
        "H.I.VALDEZ"
      ]
      for(let i=0; i < freeChildren.length; i++) {
        let found = swapList.findIndex((name) => { return name == freeChildren[i].name})
        if(found != -1) {
          let temp = freeChildren[i]
          freeChildren[i] = freeChildren[i-1]
          freeChildren[i-1] = temp
        }
      }

      
      let pos = placeFreeNodes(pNode, freeChildren, layers[1] - layers[0])
      for(let i=0; i < freeChildren.length; i++) {
        let childIndex = freeChildren[i].index
        nodesFree[childIndex].x = pos[i].x
        nodesFree[childIndex].y = pos[i].y

        // Manual adjustment
        if(nodesFree[childIndex].name == "O.K.WRIGHT") {
          nodesFree[childIndex].x = nodesFree[childIndex].x + 1.5*pNode.width
        }

        // Update edge point
        let cNode = nodesFree[childIndex]
        if(freeChildren.length <= maxHorizontalFreeNodes) {
          points = updatePoints(pNode, cNode, false)
        } else {
          points = updatePoints(pNode, cNode, true) 
        }
        let edgeIndex = freeChildren[i].edgeIndex
        edgesFree[edgeIndex].points = points

      }
    }
  }

  // Update edges for FIXED child nodes that have FREE parent nodes
  let edgesWithFixedChildNodes = edgesFree
    .filter((edge) => {
      let pNode = edge.source
      let cNode = edge.target
      let pIndex = nodesFree.findIndex((node) => { return node.name == pNode })
      let cIndex = nodesFixed.findIndex((node) => { return node.name == cNode })

      if(pIndex == -1 || cIndex == -1) {
        return false
      } else {
        return true
      }
    })

  for(edge of edgesWithFixedChildNodes) {
    let pNode = nodesFree.find((node) => { return node.name == edge.source })
    let cNode = nodesFixed.find((node) => { return node.name == edge.target })
    let edgeIndex = edgesFree.findIndex((edg) => { return (edg.source == edge.source && edg.target == edge.target)})

    points = updatePoints(pNode, cNode, false)
    edgesFree[edgeIndex].points = points
    
  }

  // Visualize the data with D3
  let drawNodes = nodesFixed.concat(nodesFree)
  if(fixedOnly) {
    drawNodes = nodesFixed
  }
  var allRect = svg
    .selectAll("rect")
    .data(drawNodes)
    .enter()
    .append("rect")
    .attr("x", (d) => { return d.x })
    .attr("y", (d) => { return d.y })
    .attr("width", (d) => { return d.width })
    .attr("height", (d) => { return d.height })
    .style("fill", (d) => { return d.color })
    .style("fill-opacity", (d) => { return 0.1 + 0.9*(d.sourceCount/sourceCountMax) })
    .style("stroke", "black")
    .style("stroke-width", (d) => { return d.targetCount })
    .append("svg:title")
    .text(function(d) {return "Name: " + d.name })

  let drawEdges = edgesFixed.concat(edgesFree)
  if(fixedOnly) {
    drawEdges = edgesFixed
  }
  let allPolyline = svg
    .selectAll("polyline")
    .data(drawEdges)
    .enter()
    .append("polyline")
    .attr("points", (d) => { return d.points })
    .style("stroke", "black")
    .style("stroke-width", 2)
    .style("fill", "none")

})




