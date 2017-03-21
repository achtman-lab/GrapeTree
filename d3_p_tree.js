D3PTree.prototype = Object.create(D3BaseTree.prototype);
D3PTree.prototype.constructor= D3PTree;


/**
*  The base class for trees
* @constructor
* @extends D3BaseTree
* @see D3BaseTree
*/

function D3PTree(elementID,data,height,width){
	D3BaseTree.call(this,elementID,data['metadata'],height,width)
	this.max_total_branch_length=0;
	this.longest_branch_length=0;
	this.max_display_length=0;
	this.click_mode = 'select';
	this.display_mode='horizontal';
	this.nwk= data['nwk'];
	this.labels_aligned=false;
	
	this.tree_root=null;
	this.selected_node = null;
	this.log_scale=false;
	this.has_collapsed_nodes=false;
	this.tree_root = this.parseNewick(data['nwk']);
	this.branch_thickness= 3;
	
	//used to calculate node ids in the recursive calculateX function
	this.count=0; 
	this.calculateX(0,this.tree_root,0,true);      
	this.x_scale_max=400;
	this.y_scale_max=600;
	this.max_node_y=this.height;
	this.xScale = d3.scale.linear().domain([0,this.max_total_branch_length]).range([0,this.x_scale_max]);
	this.yScale=d3.scale.linear().domain([0,this.max_node_y]).range([0,this.y_scale_max]);
	this.cluster = d3.layout.cluster()
	.size([this.height, this.width]);
	this.marker_size=6;
	this.leaf_label_category='strain';
	this.collapsed_branch_size=10;
	this.size_power=0.2;
	this.show_leaf_labels=false;
	this.leaf_label_text_size=14;
	this.show_branch_labels=false;
	this.branch_label_text_size=12;
	this.show_leaf_markers=true;
	this.show_branch_extensions=0;
	this.display_category=null;
	if (data['initial_category']){
		this.display_category=data['initial_category'];
	}
	if (data['layout_data']){
		var ld  = data['layout_data']
		this.setLayout(ld);
		if (ld['display_category'] !== undefined){
			this.display_category = ld['display_category'];
		}
		this._updateData(ld['node_data']);
		this.setScale(ld.scale);
		this.setTranslate(ld.translate);
		
	}
	else{ 
		this._updateData();
	}
};

D3PTree.prototype.getLayout=function(){   
	
	
	var node_data={}
	for (var i in this.nodes){
		var node = this.nodes[i];
		var obj = {"order":node.order}
		if (node.collapsed){
			obj['collapsed']=true;
			obj['collapsed_name']=node.collapsed_name;
		}
		node_data[node.id]=obj
	
	}
	var data = { 
		custom_colours:this.custom_colours,
		show_leaf_labels:this.show_leaf_labels,
		leaf_label_text_size:this.leaf_label_text_size,
		leaf_label_category:this.leaf_label_category,
		show_branch_labels:this.show_branch_labels,
		branch_label_text_size:this.branch_label_text_size,
		show_leaf_markers:this.show_leaf_markers,
		display_mode:this.display_mode,
		x_scale_max:this.x_scale_max,
		y_scale_max:this.y_scale_max,
		scale:this.scale,
		translate:this.translate,
		node_data:node_data,
		marker_size:this.marker_size,
		max_display_length:this.max_display_length,
		branch_thickness:this.branch_thickness,
		labels_aligned:this.labels_aligned,
		display_category:this.display_category
	};
	return data;	
};

D3PTree.prototype.setLayout = function(data){
	for (var key in data ){
		if (key === 'node_data'){
			continue;
		}
		if (data[key] !== undefined){
			this[key]=data[key];
		}
	}
};


/**
* Processes the data to caclulate y positions 
* (x positions calculated by calcualteX(), based on branch lengths )
* the original y positions are stored in node.y_pos
* The bottom most y position (this.max_node_y) is also calculated
* Links are also added/removed from this.links
*/
D3PTree.prototype._updateData=function(node_data){
	var self = this;
	//get the x,y position of all nodes
	this.nodes =d3.layout.cluster()
		.sort(function(a,b){
			if (node_data){
				var a_order=0
				var b_order=0
				var data =  node_data[a.id];
				if (data){
					a_order =parseInt(data.order)
				}
				var data =  node_data[b.id];
				if (data){
					b_order =parseInt(data.order)
				}
				return a_order-b_order;
				
			}
			else{
				return (parseInt(a.order)-parseInt(b.order));
			}
		})	
		.size([this.height, this.width ])
		.nodes(this.tree_root);
		
	for (var i in this.nodes){
		var node = this.nodes[i];
		node.y_pos=node.x;
		if (node.x>this.max_node_y){
			this.max_node_y=node.x;          
		}
	}
	//swap and collapse nodes according to the data given
	if(node_data){
		var collapsed= false;
		for (var i in this.nodes){
			node = this.nodes[i];
			var data = node_data[node.id];
			if (data && data.collapsed){
				this.collapseNode(node);
				node.collapsed_name = data.collapsed_name;
				collapsed=true;
			}
			
		}
		if (collapsed){
			this._updateData();
		}
		
	}
	//add remove the branches/collapsed branches
	var link_update=this.canvas.selectAll(".link")
		.data(this.nodes,function(d){
			return d.id;
	});			
	link_update.exit().remove();  
	link_update.enter().append("path")
				.attr("class", "link")
				.on("click", function(d) { 
					self.branchClicked(d);
		
				}); 
	this.links = this.canvas.selectAll('.link');
	this.collapsed_node_data= this.nodes.filter(function(d){
		return d.collapsed;
	});
	this.has_collapsed_nodes = (this.collapsed_node_data.length>0);
	this.canvas.selectAll(".collapsed-node").remove();
	
	var collapsed_nodes_update = this.canvas.selectAll(".collapsed-node").
			data(this.collapsed_node_data,function(d){
				return d.id;
			});
	collapsed_nodes_update.exit().remove(); 

	collapsed_nodes_update.enter()
			.append("polygon")
			.attr("class","collapsed-node")
			.style("fill","gray")
			.on("click",function (d){
				self.uncollapse_node(d,this);
			
			});
	this.collapsed_nodes= this.canvas.selectAll(".collapsed-node");
	
	
	//get the leaf nodes
	this.end_nodes = this.nodes.filter(function(d){	
		if (d.children || d.hidden_children){
			return false;
		}	
		return true;
	});
	
	//get the leaf nodes and collapsed
	this.end_nodes_col = this.nodes.filter(function(d){	
		if (d.children){
			return false;
		}
		return true;
	});
	
	//all nodes except the root and hidden
	this.nodes_not_root =this.nodes.filter(function(d){
		if (! d.parent){
			return false;
		}
		return true;
	});	
	
	//change the x and y positions based on scales
	this.xScale.range([0,this.x_scale_max]);
	this.yScale.range([0,this.y_scale_max]);
	
	//draw the branches
	this._scaleNodePositions();
	this._drawBranches();
	this._setCollapsedBranchPositon();
	
	if (this.display_category){
		this._changeCategory(this.display_category);		
	}
	
	//Add the markers and labels
	this._updateLeafLabels();
	this._updateLeafMarkers();
	this._updateBranchLabels();
};

D3PTree.prototype.swapNodes=function(node){
	var temp =node.children[0].order;
	node.children[0].order=node.children[1].order;
	node.children[1].order=temp;
	this._updateData();
};

D3PTree.prototype.changeLeafLabel= function (type){
		this.leaf_label_type=type;
		this._drawLeafLabels();
};


D3PTree.prototype.getNode=function(id){
	for (var i in this.nodes){
		var node = this.nodes[i];
		if (node.id===id){
			return node;
		}
	}
}



D3PTree.prototype.changeCategory=function(category){
	var self =this;
	this._changeCategory(category);
	if (this.leaf_label_type !== "strain_name"){
		this.leaf_label_type=category;	
	}
	this._updateLeafMarkers();
	
};

D3PTree.prototype._drawCollapsedMarkers= function(){
	var self = this;
	if (! this.has_collapsed_nodes){
		return;
	}
	var arc = d3.svg.arc().outerRadius(function(d){
               return self.marker_size*Math.pow(d.data.size,self.size_power);
        }).innerRadius(0);
	this.collapsed_pies.attr("d",arc).attr("fill",function(d){
		return self.category_colours[d.data.type];
	}).style("stroke","black");
	
	this.collapsed_markers.filter(function(d){
			return d.highlighted
		}).selectAll(".collapse-path")
		.style("stroke","yellow")
		.attr("stroke-width","5px")
};


D3PTree.prototype._setCollapsedMarkerPosition = function(){
	if (! this.has_collapsed_nodes){
		return;
	}
	var self = this;
	var xm = this.xScale(this.max_total_branch_length);
	
	if (this.display_mode === 'horizontal'){
		this.collapsed_markers
		.attr("transform",function(d){
			var offset =  self.marker_size*Math.pow(d.child_ids.length,self.size_power);
			var x = self.labels_aligned?xm+offset:d.collapsed_x+offset;
			return  "translate("+x+","+d.y+")";
	
		});
	}	
	else if (this.display_mode === 'circular'){
		this.collapsed_markers
		.attr("transform", function(d) {
			var offset =  self.marker_size*Math.pow(d.child_ids.length,self.size_power);
			var x = self.labels_aligned?xm:d.collapsed_x;
			return "rotate(" + (d.y- 90) + ")translate(" + (x+ offset) + ",0)" ;
		});
	}
};

D3PTree.prototype.selectNodes= function(d){
	d.selected=true;
	this.selected_node=d;
	this.tagChildren(d,"selected");
	this.links.filter(function(d){
		return d.selected;
	}).style("stroke","red");
};

D3PTree.prototype.collapseNode= function(node){
	if (!node.children){
		return;
	}
	node.collapsed=true;
	this.maxX_pos=0;
	this.child_ids=[];
	this.children_
	this.getMaxX_pos(node);
	node.collapsed_x_pos= this.maxX_pos;
	node.hidden_children=node.children;
	delete node.children;
	node.child_ids=[];
	for (var i in this.child_ids){
		node.child_ids.push(this.child_ids[i]);
	}
	this.nodeCollapsed(node.id)
};

D3PTree.prototype.nodeCollapsed=function(node){};

D3PTree.prototype.setCollapsedNodeName= function(id,name){
	var node = this.getNode(id);
	node.collapsed_name = name;
	this._drawLeafLabels();
};

D3PTree.prototype._getPieData= function(child_ids){
	var val_counts={};
	for (var i in child_ids){
		var strain = this.metadata[child_ids[i]];
		if (! strain){
			continue;
		}		
		var val = strain[this.display_category];
		if (! val){
			val = 'missing';		
		}
		var count = val_counts[val];
		if (!count){
			val_counts[val]=1;
		}
		else{
			val_counts[val]++;
			
		}	
	}
	var pie_data = [];
	for (var val in val_counts){
		pie_data.push({value:val_counts[val],type:val,size:child_ids.length});
	}
	var pie= d3.layout.pie().sort(null).value(function(it){
			return it.value;
	});
	return pie(pie_data);
};

D3PTree.prototype.uncollapse_node= function(data,wedge){
	delete data.collapsed;
	delete data.collapsed_x_pos;
	delete data.collapsed_x;
	delete data.child_ids;
	data.children = data.hidden_children;
	delete data.hidden_children;
	wedge.remove();
	this._updateData();	
};

D3PTree.prototype.getSelectedIDs= function(node){
	var sel_ids = [];
	for (var i in this.nodes){
		var node = this.nodes[i];
		if (!node.children && node.selected){
			var ids =  this.grouped_nodes[node.name];
			if (ids){
				for (i in ids){
					sel_ids.push(parseInt(ids[i]))
				}				
			}		
		}
	}
	return sel_ids;
};

D3PTree.prototype.getNodesWithoutData=function(){
	var ret_list=[];
	for (var i in this.nodes){
		var node = this.nodes[i];
		if (!node.children){
			var strain = this.metadata[node.name];
			if (!strain){
				ret_list.push(node.name);
			}
			
		}
	}
	return ret_list;
};

D3PTree.prototype.branchClicked = function(d){
	if (this.click_mode ==="select"){
		this.selectNodes(d);
	}
	else if (this.click_mode==='collapse'){
		this.collapseNode(d);
		this._updateData();
	}
	else if (this.click_mode==='swap'){
		this.swapNodes(d);
	}
};

D3PTree.prototype._scaleNodePositions=function(){
	var self=this;
	var xm = this.xScale(this.max_total_branch_length);
	for (var index in this.nodes){
		var d= this.nodes[index];
		d.y = self.yScale(d.y_pos);
		if (this.log_scale){
			d.x =Math.pow(self.xScale(d.x_pos),0.5);
		}
		else{
			d.x =self.xScale(d.x_pos);
		}
		if (d.collapsed){
			d.collapsed_x=self.xScale(d.collapsed_x_pos);
		}
	}	
};

/*
* This method will update all the element positions in the tree
*/
D3PTree.prototype._updateAllElementPositions = function(){
	this._drawBranches();
	this._setLeafMarkerPosition();
	this._setCollapsedBranchPositon();
	this._setLeafLabelPosition();
	this._setBranchLabelPosition();
};

D3PTree.prototype._drawBranches=function(){
	var self =this;
	this.links.attr("d",function(d){
		var p=d.parent;
		if (!p){
			p=d;
		}  
		if (self.display_mode === 'circular'){
			return self.step(p.y, p.x, d.y, d.x);
		}
		else if (self.display_mode === 'horizontal'){
			return "M"+d.x+","+d.y+"L"+p.x+","+d.y+"L"+p.x+","+p.y;
		}
	}).style("stroke-dasharray",function(d){
		if (self.max_display_length && d.length>self.max_display_length){
			return "5,3";
		}
		return "";
	}).style("stroke-width",this.branch_thickness).
	style("stroke",function(d){
		
		return d.selected?"red":"black"
	})
	.attr("fill","none");
};

/* This will remove all markers from the tree and if show_leaf_markers is true will
* add create and draw all eaf markers (for both normal and collapsed nodes)
* This method should be called to hide/show markers and if the tree structure 
* has changed
*/
D3PTree.prototype._updateLeafMarkers=function(){
	var self=this;
	this.canvas.selectAll(".marker").remove();
	this.canvas.selectAll(".collapsed-marker").remove();
	this._setLeafLabelPosition();	
	if (!this.show_leaf_markers){				
		return;
	}	
	this.markers = this.canvas.selectAll(".marker").data(this.end_nodes).enter()
			.append("circle")
			.attr("class","marker");
			
	if (this.has_collapsed_nodes){
		var collapsed_marker_update  = this.canvas.selectAll(".collapsed-marker").
				data(this.collapsed_node_data,function(d){
					return d.id;
				});
		this.collapsed_markers= collapsed_marker_update.enter().append("g")
		.attr("class","collapsed-marker");
		var existing = this.collapsed_markers.selectAll(".collapse-path").data(function(d){
			return self._getPieData(d.child_ids);
		
		});
		existing.enter().append('path').classed("collapse-path",true);
		this.collapsed_pies = this.canvas.selectAll(".collapse-path");
	}
	this._setLeafMarkerPosition();
	this._drawLeafMarkers();
};


/* Sets the position of all markers for both nomal and collapsed nodes (if any)
*/
D3PTree.prototype._setLeafMarkerPosition =  function(){
	var self = this;
	var xm = this.xScale(this.max_total_branch_length);
	var offset =  this.marker_size;
	if (this.display_mode === 'horizontal'){
		this.markers.attr("cx",function(d){
			return  self.labels_aligned?xm+offset:d.x+offset;
		})
		.attr("cy",function(d){
			return d.y;
		}).
		attr("transform",null);
	}	
	else if (this.display_mode === 'circular'){
		this.markers.attr("cx",null).attr("cy",null)
		.attr("transform", function(d) {
			var x = self.labels_aligned?xm:d.x
			return "rotate(" + (d.y- 90) + ")translate(" + (x+ offset) + ",0)" ;
		});
	}
	if (this.has_collapsed_nodes){
		this._setCollapsedMarkerPosition();	
	}
};

D3PTree.prototype._drawLeafMarkers=function(){
	if (! this.show_leaf_markers){
		return;
	}
	var self =this;
	this.markers.style("fill",
			function(d){
				var val="missing";
				var arr = self.grouped_nodes[d.name];
				if (arr){
					var strain = self.metadata[arr[0]];
					var val = strain[self.display_category];
					if (!val){
						val = "missing";	
					}
				}
				return self.category_colours[val];
			})
			.attr("r",this.marker_size)
			.style("stroke",function(d){
				if (d.highlighted){
					return "yellow"
				}
				return "black";
			
			})
			.attr("stroke-width",function(d){
				if (d.highlighted){
					return "5px";
				}
				return "1px-";
			});
	if (!this.has_collapsed_nodes){
		return;
	}
	this._drawCollapsedMarkers();
};

//link extenstions - not used
D3PTree.prototype._linkExtensions=function(){
	
	this.link_extensions.attr("d",function(d){
			var p1 = [d.x,d.y];
			var p2= [xm,d.y];
			if (self.updateLeafMarkers==='circular'){
				p1 = self.getRadialCoordinates(d.y,d.x);
				p2 = self.getRadialCoordinates(d.y,xm)
			}
			return "M" + p1[0]+","+p1[1]+" L"+p2[0]+","+p2[1];
			}).style('opacity',self.show_branch_extensions);
			
	if (this.show_branch_labels){
		this.setBranchLabelPosition();
	}

};

D3PTree.prototype.setXScale= function(amount){
	this.x_scale_max=amount;
	this.xScale.range([0,this.x_scale_max]);
	this._scaleNodePositions();
	this._updateAllElementPositions();
	
};

D3PTree.prototype.setYScale= function(amount){	
	this.y_scale_max=amount;
	this.yScale.range([0,this.y_scale_max]);
	this._scaleNodePositions();
	this._updateAllElementPositions(); 
};

D3PTree.prototype.setXLogScale= function (scale){
	if (scale){
		this.xScale.domain([0,Math.pow(this.max_total_branch_length,0.5)]);
	}
	else{
		this.xScale.domain([0,this.max_total_branch_length]);
	}
	this.log_scale=scale;
	this._scaleNodePositions();
	this._updateAllElementPositions();
};

D3PTree.prototype.setMaxBranchLength = function(value){
	value=parseFloat(value);
	if (value>this.longest_branch_length){
		return;
	}
	this.max_display_length=value;
	this.max_total_branch_length=0;
	this.longest_branch_length=0;
	this.count=0;
	this.calculateX(0,this.tree_root,value);
	this._scaleNodePositions();
	this._updateAllElementPositions();
};

D3PTree.prototype.setLeafLabelTextSize= function (size){
	this.leaf_label_text_size=size;
	this.leaf_labels.attr('font-size',this.leaf_label_text_size+"px");	
};

D3PTree.prototype.showBranchLabels= function (show){
	this.show_branch_labels=show;
	this._updateBranchLabels();
};

D3PTree.prototype._updateBranchLabels= function(){
	this.canvas.selectAll(".link-labels").remove();
	if (!this.show_branch_labels){
		return;
	}
	this.branch_labels = this.canvas.selectAll(".link-labels")
		.data(this.nodes_not_root).enter()
		.append("text")
		.attr("dy", "1em")
		.attr("class","link-labels")
		.attr("text-anchor","end");
	this._setBranchLabelPosition();
	this._drawBranchLabels();
		
};

D3PTree.prototype._setBranchLabelPosition=function(){
	var self = this;
	if (!this.show_branch_labels){
		return;
	}
	if (this.display_mode === 'circular'){
		this.branch_labels.attr("transform", function(d) {
			var len = d.length;
			if (self.max_display_length){
				len = d.length>self.max_display_length?self.max_display_length:d.length;
			}
			var x = d.x-(self.xScale(len/2));
			return "rotate(" + (d.y- 90) + ")translate(" + x+ ",0)" + (d.y < 180 ? "" : "rotate(180)");
		})
		.style("text-anchor", function(d) {
			return d.y < 180 ? "end" : "start";
		});
	}
	else{
		this.branch_labels.style("text-anchor","end")
			.attr("transform", function(d) {
			var len = d.length;
			if (self.max_display_length){
				len = d.length>self.max_display_length?self.max_display_length:d.length;
			}
			return "translate(" + (d.x-(self.xScale(len)/2)) + ","+(d.y)+")";
		});
	}
};

D3PTree.prototype._drawBranchLabels= function(){
	if (! this.show_branch_labels){
		return;
	}
	this.branch_labels.text(function(d) {
		return d.length.toPrecision(2);
	})
	.attr("font-size",this.branch_label_text_size+"px");
};

D3PTree.prototype.setBranchThickness = function(thickness){
	this.branch_thickness = thickness;
	this.links.style("stroke-width",this.branch_thickness);
};

D3PTree.prototype.setBranchLabelTextSize= function (size){
	this.branch_label_text_size=size;
	this._drawBranchLabels();
};

D3PTree.prototype.alignLeafLabels= function (yes){
	this.labels_aligned=yes;
	this._setLeafLabelPosition();
	this._setLeafMarkerPosition();
};

D3PTree.prototype.showLeafMarkers= function (show){
	this.show_leaf_markers=show
	this._updateLeafMarkers();
};

D3PTree.prototype.setMarkerSize= function (size){
	this.marker_size=size;
	this._setLeafMarkerPosition();
	this._drawLeafMarkers();
	this._setLeafLabelPosition();

};

D3PTree.prototype.showSubTree = function (){
	var ch = this.selected_node['children'];
	this.original_tree_root=this.tree_root;
	this.tree_root= {children:[ch[0],ch[1]]}
	this.max_total_branch_length=0;
	this.longest_branch_length=0;
	this.count=0;
	this.calculateX(0,this.tree_root,0);
	this.xScale = d3.scale.linear().domain([0,this.max_total_branch_length]).range([0,this.x_scale_max]);
	this._updateData();
};

D3PTree.prototype.showWholeTree = function (){
	var ch = this.selected_node['children'];
	this.tree_root = this.original_tree_root;//this.parseNewick(this.nwk);
	this.max_total_branch_length=0;
	this.longest_branch_length=0;
	this.count=0;
	this.calculateX(0,this.tree_root,0);
	this.xScale = d3.scale.linear().domain([0,this.max_total_branch_length]).range([0,this.x_scale_max]);
	this._updateData();
};

D3PTree.prototype.addBranchLabels=function(){
	var self = this;
	var links_not_root = this.nodes.filter(function(d){
				if (! d.parent){
					return false;
				}
				return true;
			});
	
	this.canvas.selectAll(".link-labels").remove();
	var link_label_update = this.canvas.selectAll(".link-labels")
	.data(links_not_root,function(d){
					return d.id;
	});
	
	this.link_labels = link_label_update
	.enter().append("text")
	.attr("dy", "1em")
	.attr("class","link-labels")
	.attr("text-anchor","middle")
	.text(function(d) {
		return d.length;
	});
	this.setBranchLabelPosition();	
};


D3PTree.prototype.showLeafLabels = function(show){
	this.show_leaf_labels=show;
	this._updateLeafLabels();
};

D3PTree.prototype._updateLeafLabels=function(){
	var self=this;
	this.canvas.selectAll(".end-label").remove();
	if (! this.show_leaf_labels){
		return;
	}
	this.leaf_labels= this.canvas.selectAll(".end-label")
			.data(this.end_nodes_col,function(d){
					return d.id;
		}).enter()
		.append("text")
		.attr("class","end-label")
		.attr("text-anchor","start")
		.attr("alignment-baseline","middle")
	this._setLeafLabelPosition();
	this._drawLeafLabels();		
};


D3PTree.prototype.setLeafText=function(value){
	this.leaf_label_category=value;
	this._drawLeafLabels();

}

D3PTree.prototype._drawLeafLabels = function(){
	if (!this.show_leaf_labels){
		return;
	}
	var self = this;
	var field = self.leaf_label_category;
	
	this.leaf_labels.text(function(d){
		if (d.collapsed){
			if (d.collapsed_name){
				return d.collapsed_name;
			}
			else{
				return "";
			}
		}
		var strain_ids = self.grouped_nodes[d.name];
		if (! strain_ids){
			return "missing";
		}
		var strain = self.metadata[strain_ids[0]];
		if (! strain){
				return "missing";
		}
		var text = strain[field];
		if (! text){
			text = 'missing';
		}
		return text;
	})
	.attr("font-size",this.leaf_label_text_size+"px")
};

D3PTree.prototype._setLeafLabelPosition =function(){
	if (! this.show_leaf_labels){
		return;
	}
	var self = this;
	var xm = this.xScale(this.max_total_branch_length);
	var offset = this.show_leaf_markers?(this.marker_size*2)+2:2
	if (this.display_mode==='circular'){		
		this.leaf_labels.attr("x",null).attr("y",null)
		.attr("transform", function(d) {
			var x=0;
			if (d.collapsed){
				offset = self.show_leaf_markers?((self.marker_size*Math.pow(d.child_ids.length,self.size_power))*2)+2:2
			}
			if (self.labels_aligned){
				x=xm+offset;
			}
			else{
				x = d.collapsed?d.collapsed_x+offset:d.x+offset;
			}
			
			return "rotate(" + (d.y- 90) + ")translate(" + x + ",0)" + (d.y < 180 ? "" : "rotate(180)")
		})
		.style("text-anchor", function(d) {
			return d.y < 180 ? "start" : "end";
		});
	}
	else if (this.display_mode==='horizontal'){	
		this.leaf_labels.attr("transform",null)
		.style("text-anchor","start")
		.attr("x",function(d){
			if (d.collapsed){
				offset = self.show_leaf_markers?((self.marker_size*Math.pow(d.child_ids.length,self.size_power))*2)+2:2
			}
			var x=0;
			if (self.labels_aligned){
				x=xm+offset;
			}
			else{
				x = d.collapsed?d.collapsed_x+offset:d.x+offset;
			}
			
			return x;
		})
		.attr("y",function(d){
			return d.y;
		});		
	}
};

D3PTree.prototype.clearSelection= function(){
	this.links.filter(function(d){
			return d.selected;
	}).style("stroke","black");
	
	for (var i in this.nodes){
		delete this.nodes[i].highlighted;
		delete this.nodes[i].selected;
	}
	this._drawLeafMarkers();	
};
	
D3PTree.prototype.highlightIDs=function(ids){
	
	for (var i in this.end_nodes_col){
		var node = this.end_nodes_col[i];
		
		if (node.collapsed){
			for (var i2 in node.child_ids){
				if (ids.indexOf(node.child_ids[i2])!==-1){
					node.highlighted=true;
				}			
			}		
		}
		else{
			var item_ids = this.grouped_nodes[node.name];
			if (item_ids){
				for (var i2 in item_ids){
					if (ids.indexOf(item_ids[i2])!==-1){
						node.highlighted = true;
						break;
					}
				}
			}
		}
	}
	if (!this.showLeafMarkers){
		this.showLeafMarkers(true);
	}
	else{
		this._drawLeafMarkers();
	}
};




D3PTree.prototype._setCollapsedBranchPositon=function(){
	var self = this;
	if (!this.has_collapsed_nodes){
		return;
	}
	this.collapsed_nodes.attr("points",function(d){	
		var p = d.parent;
		if  (self.display_mode === 'horizontal'){
			var top = parseInt(d.y)-self.collapsed_branch_size;
			var bot = parseInt(d.y)+self.collapsed_branch_size;
			var points = p.x+","+d.y+" "+d.collapsed_x+","+top+" "+d.collapsed_x+","+bot;
			return points;
		}
		else if  (self.display_mode==='circular'){
			var oXY = self.getRadialCoordinates(d.y,p.x);	
			var leftXY =  self.getRadialCoordinates(parseInt(d.y)-(2),d.collapsed_x);
			var rightXY =  self.getRadialCoordinates(parseInt(d.y)+(2),d.collapsed_x);
			var points = oXY[0]+","+oXY[1]+","+leftXY[0]+","+leftXY[1]+","+rightXY[0]+","+rightXY[1];
			return points;
		}
	});
};

/*

*/
D3PTree.prototype.calculateX =function(len,node,max_len,assign_id){
	var length = len;
	var max_len=max_len;
	if (node.length){
		var cor_length=node.length;
		if (max_len && node.length>max_len){
			cor_length=max_len;
		}
		length=length+cor_length;
		if (cor_length>this.longest_branch_length){
			this.longest_branch_length=cor_length;
		}
	}
	node.x_pos=length;
	if (assign_id){
		node.id = this.count;
	}
	this.count++;
	if (length>this.max_total_branch_length){
		this.max_total_branch_length=length;
	}
	var children = node.children;
	if (children){
		for (var i in children){
			children[i].order=1-i;
			this.calculateX(length,children[i],max_len,assign_id);
		}                  
	}                
};



D3PTree.prototype.tagChildren =  function (node,tag){
	if (node.children){
		for (var i in node.children){
			var child = node.children[i];
			child[tag]=true;
			this.tagChildren(child,tag);        
		}       
	}
};

/*Given a node will work out the x value of the rightmost node and store
* it in this.maxX_pos
* The strain ids of all child leaf nodes are stored in this.child_ids
*/
D3PTree.prototype.getMaxX_pos =  function (node){
	if (node.hidden_children || node.children){
		var children = node.hidden_children?node.hidden_children:node.children;
		for (var i in children){
			var child = children[i];
			var x = child.x_pos;
			if (x>this.maxX_pos){
			this.maxX_pos=x;
			}
			this.getMaxX_pos(child);        
		}       
	}
	else{
		var ids =  this.grouped_nodes[node.name];
		if (ids){
			this.child_ids.push(ids[0]);
		}
		
	}
};

D3PTree.prototype.switchMode=function(type){
	this.display_mode=type;
	if (type === 'circular'){
		this.y_scale_max=360;
		this.yScale.range([0,this.y_scale_max]);
	}
	else if (type==='horizontal'){
		this.y_scale_max=600;
		this.yScale.range([0,this.y_scale_max]);
	
	}
	this._scaleNodePositions();
	this._updateAllElementPositions(); 
};


D3PTree.prototype.step = function(startAngle, startRadius, endAngle, endRadius){
  var c0 = Math.cos(startAngle = (startAngle - 90) / 180 * Math.PI),
	  s0 = Math.sin(startAngle),
	  c1 = Math.cos(endAngle = (endAngle - 90) / 180 * Math.PI),
	  s1 = Math.sin(endAngle);
  return "M" + startRadius * c0 + "," + startRadius * s0
	  + (endAngle === startAngle ? "" : "A" + startRadius + "," + startRadius + " 0 0 " + (endAngle > startAngle ? 1 : 0) + " " + startRadius * c1 + "," + startRadius * s1)
	  + "L" + endRadius * c1 + "," + endRadius * s1;
};

D3PTree.prototype.getRadialCoordinates= function(angle,radius){
	  var c0 = Math.cos(angle = (angle- 90) / 180 * Math.PI),
			s0 = Math.sin(angle);
		return [radius*c0,radius*s0];
};

D3PTree.prototype.brushEnded=function(extent){
       for (var i in this.nodes){
	      var d = this.nodes[i];
	      d.selected =(extent[0][0] <= d.x && d.x < extent[1][0] && extent[0][1] <= d.y && d.y < extent[1][1]);
	      
       }
       this._drawBranches();
};