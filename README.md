This is my attempt at the 2009 Graph Drawing competition: Org Chart (Partial Graph Drawing)

- Overview
  - Data: click [here](http://www.graphdrawing.de/contest2009/gdcategories2009.html#OrgChart)
  - Format
    - Nodes: (name, width, height, x, y)
    - Edges: (source, target, x0, y0, … , xn, yn)
    - ‘…’ are the bend points between source and target
    - Any node or edge that only contain the bold attributes are free to move
  - 171 nodes and 170 directed edges
  - 101 nodes and 96 edges are fixed
  - The fixed nodes have a minimal spacing of approximately 40 units (border to border)
  - The edges should be laid out in orthogonal fashion
  
- Drawing fixed nodes
  - Restructure the raw data into an appropriate csv format
  - Load the data using d3.csv()
  - Draw fixed nodes with the following features:
    - ‘Fill opacity’ of each node is proportional to its source count
    - ‘Outline thickness’ of each node is proportional to its target count
    - Show employee name on mouseover (in browser)
![](https://d2mxuefqeaa7sj.cloudfront.net/s_7BE943FC4B3863EEC083A392944492DEA59C939D7E8E9E2F38FE9F7CC10A8183_1504771650474_image.png)

  - Things to note about the fixed nodes:
    - Top node is a root because its target count is zero (no outline)
    - All other nodes have the same target count of 1 which means each node only has one parent (except for the root which has none)
    - Some isolated nodes are yet to be ‘linked’ to parents which are free nodes
    - The y co-ordinates are placed in layers (there is consistent horizontal alignment)
    - Child nodes are usually placed on the same layer unless there are more than 3 siblings, in which case, the child nodes are placed vertically
    - Vertical edges don’t go more than 6 layers deep


- My Strategy
  - This strategy is based on the existing traits that I can observed from the fixed nodes
  - Run an iterative procedure for each layer (starting from the top):
    - Draw the child nodes starting with the left most parent (moving to the right):
      - If there are no existing edges from the parent node:
        - Closely place child nodes if the children are not source nodes
        - Widely place child nodes if any of the children is a source node
        - Vertically place the child nodes if there are more than 3 siblings or if there is no more horizontal space
      - If there are existing edges:
        - Place the nodes closely to the right (or below) of the fixed sibling
        - If there is a large space between existing siblings, place the nodes evenly in between the space
      - If a parent has more than a specified number of children (say 6 or more), draw the children vertically down multiple layers
  - After the iterative procedure, there were some overlapping of nodes.
  - By switching the ordering of a few children, we get the final following result.


![](https://d2mxuefqeaa7sj.cloudfront.net/s_7BE943FC4B3863EEC083A392944492DEA59C939D7E8E9E2F38FE9F7CC10A8183_1504836969033_image.png)

