requirejs.onResourceLoad = function (context, map, depMaps) {
  if (!window.rtree) {
    window.rtree = {
      tree: {}
    };
  }

  var tree = window.rtree.tree;

  function Node() {
    this.deps = [];
  }

  if (!tree[map.name]) {
    tree[map.name] = new Node();
  }

  // For a full dependency tree
  if (depMaps) {
    for (var i = 0; i < depMaps.length; ++i) {
      tree[map.name].deps.push(depMaps[i].name);
    }
  }
};