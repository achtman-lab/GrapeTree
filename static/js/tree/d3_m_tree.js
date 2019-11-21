D3MSTree.prototype = Object.create(D3BaseTree.prototype);
D3MSTree.prototype.constructor = D3MSTree;

/**
* @typedef {Object} InitialData
* An object describing the tree. Either nodes and links or nwk or nexus
* are the only required properties,the rest will be set as default
* @property {list} nodes A list of node names ['ST131','ST11']
* @property {list} links A list of objects containing source,target and distance , where source and targets 
* are indexes to the nodes list e.g. [{source:0,target:1,distance:10},...]
* @property {string} nwk A tree in newick format
* @property {string} nexus A tree in nexus format
* @property {string} layout_algorithm The initial algorithm to work out node positions. Can be either 'force' or
* 'greedy'. Default is 'greedy'
* @property {LayoutData} layout_data Data describing the layout. If none is supplied default
* values will be supplied and the specified algorithm will calculate the initial layout
* @property {object} metadata The metadata for the tree - see {@link D3MSTree#addMetadata} 
* @property {string} initial_category The initial category to display in the tree - see {@link D3MSTree#changeCategory}
* @property {object} metadata_options A dictionary of metadata fields that can be dsiaplyed to their labels
* e.g. {"collection_date":"Collection Date"......}
*/

/**
* @constructor
* @extends D3BaseTree
* @param {string} element_id The id of the container for the tree
* @param {InitialData} data An  object containing the tree's data
* @param {function} callback The function to be called when the set up is finished (optional).
* The callback is passed the tree object and a message describing the state of initialisation.
* The message will be 'complete' when the tree is finished
* @param {integer} height - the initial height (optional)
* @param {integer} width - the initial width  (optional)
*/
function D3MSTree(element_id,data,callback,height,width){
        
        D3BaseTree.call(this,element_id,data['metadata'],height,width);
        var self =this;
        this.tempy=1;
        this.taxon_key=null;
        //d3 force parameters
        this.charge=0;
        this.maxChargeDistance=2000;
        this.gravity=0.0;
        this.original_node_positions={};
        //label parameters
        this.base_font_size=10;
        this.show_node_labels=false;
        this.node_font_size=14;
        this.link_font_size=10;
        this.log_link_scale=false;
        this.fixed_mode=true;
        this.node_radii={};
        this.previous_node_radii={};
        this.node_clicked_listeners=[];
        this.link_clicked_listeners=[];
        this.segment_over_listeners=[];
        this.segment_out_listeners=[];
        this.link_over_listeners=[];
        this.link_out_listeners=[];
        
        //Any link with a value above this will have be as long as _max_link_scale
        this.max_link_length=10000;
        //the length in pixels of the longest link
        this.max_link_scale=500;
        this.hide_link_length  = data['hide_link_length'] ? data['hide_link_length'] : 10000;
        this.show_link_labels=false;
		this.show_hypothetical_nodes=false;
        
        this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]);

        this.show_individual_segments=false;
        //node sizes and log scale
        this.size_power=0.5;
        this.base_node_size=10;
        this.update_graphics=true;
      
        this.precompute=true;
        
        
        this.pie = d3.layout.pie().sort(null).value(function(it){
                return it.value;
        });
      
        if (data['initial_category']){
                this.display_category=data['initial_category'];
        }
		if (data['category_num']){
			this.category_num=data['category_num'];
        }

		if (data['metadata_options']){
			this.addMetadataOptions(data['metadata_options']);
		}
        this.arc = this._calculateArc();
     
    
        this.d3_force_directed_graph = d3.layout.force();
        
        //dragging operations
        this.initial_drag_angle=0;
        this.drag_source=0;
        this.drag_link = null;
        this.drag_orig_xy = [0,0];
        
        this.force_drag = this.d3_force_directed_graph.drag()
        .on('dragstart', function(it){
              it.id ? self._dragStarted(it) : self._dragStarted(it.target);
        })
        .on('drag', function(it){
              it.id ? self._dragging(it) : self._dragging(it.target);
        })
        .on('dragend',function(it){
              it.id ? self._dragEnded(it) : self._dragEnded(it.target);
        });

        this.add_collapsed_lengths=true;
        this.node_collapsed_value=0;

        this.manual_collapsing = {};

        
        this.force_nodes = this.d3_force_directed_graph.nodes();
        this.force_links = this.d3_force_directed_graph.links();

        if (data['nexus'] || data['nwk']){
			var root = data['nexus'] ? this.parseNexus(data['nexus']) : this.parseNewick(data['nwk']);
			if (data['layout_data'] && data['layout_data'].nodes_links && data['layout_data'].nodes_links.backup) {
				this.backup = data['layout_data'].nodes_links.backup;
				this.original_nodes = JSON.parse(JSON.stringify(this.backup.curr_nodes));
				this.original_links = JSON.parse(JSON.stringify(this.backup.curr_links));

			} else {
				this.original_nodes=[];
				this.original_links=[];
				this.createLinksFromNewick(root);
			}

			for (var i in this.original_nodes){
				var name = this.original_nodes[i];
				this.grouped_nodes[name]=[name];
			}

        } else {
			this.original_nodes=data['nodes'];
			this.original_links=data['links'];
			this.newickTree=data['newickTree'];
        }

        if (callback){
			callback(this,this.original_nodes ? "Collapsing Nodes:"+this.original_nodes.length : "Collapsing Nodes.");
        }

       	this._collapseNodes(0);
		this.original_node_positions =  this.greedy_layout(this.force_nodes, this.max_link_scale, this.base_node_size); 

        var positions = data['layout_data'] ? data['layout_data']['node_positions'] : null;

		var to_collapse=this.node_collapsed_value=0;
		this.manual_collapsing = {};
        if (positions && data['layout_data']['nodes_links']){
			to_collapse = this.node_collapsed_value=data['layout_data']['nodes_links']['node_collapsed_value'];
			this.manual_collapsing = data['layout_data']['nodes_links']['manual_collapsing'] ? data['layout_data']['nodes_links']['manual_collapsing'] : {};
        } else if (this.original_links.length > 20000) {
       		var link_distances = this.original_links.map(function(l) {return l.distance;}).sort(function(n1, n2) {return n2-n1});
			if (to_collapse < link_distances[20000]) {
				to_collapse = link_distances[20000];
				alert('Too many nodes. Branches <= '+to_collapse+' are collapsed in initial layout. You can uncollapse them later. ');
			}
			delete link_distances;
		}
		this._collapseNodes(to_collapse);

        if (callback){
                callback(this,"Nodes"+this.force_nodes.length);
        }

        //links and nodes given without initial positions 
        if (data['layout_algorithm'] !== 'force' && ! positions) {
            positions =  this.greedy_layout(this.force_nodes, this.max_link_scale, this.base_node_size); 
            data['layout_data'] = {"node_positions":positions};
            this.original_node_positions = positions;
        }
        
        //this._updateNodeRadii();
        this._start(callback,data['layout_data']);
};

D3MSTree.prototype.greedy_layout = function(nodes, link_scale, node_size) {
        var hashCode = function(s){
                return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
        }
        // determine minimum params
        for (var id in nodes) {
                var node = nodes[id];
                if (! node.size) node.size = (node.children && node.children.length > 0 ? 0.01 : 1);
        }
        var max_radial = 0.0, min_arc = 0.0;
        for (var id in nodes) {
                var node = nodes[id];
                if (node.link && node.link.value > max_radial) {
                        max_radial = node.link.value;
                }
                min_arc += node.size;
        }
        var min_radial = max_radial/link_scale * (2*Math.pow(node.size, this.size_power));
        var min_arc = min_radial * Math.PI / min_arc;
        
        for (var iteration=0; iteration < 20; iteration ++) {
                var records = [];
                var max_span = [[], 0];
                for (var ite=0; ite <11; ite ++) {
                        max_span = [[], 0];
                        // get radius of descendents
                        for (var id = nodes.length-1; id >= 0; id --) {
                                node = nodes[id];
                                if (node.spacing) continue ;
                                var nr = Math.pow(node.size, this.size_power);
                                var span1 = [min_radial*nr, Math.asin(min_arc*nr / min_radial)]; // node span
                                var radial_sum = 0, angle_sum = 0;  // descending span
                                for (var jd in node.children) {
                                        child = node.children[jd];
                                        if (! child.des_span) continue;
                                        self_radial = min_radial * Math.sqrt(node.size) + child.link.value;
                                        if (Math.cos(Math.PI - child.des_span[1]) > child.des_span[0] / self_radial ) {
                                                if (child.des_span[0] < self_radial) {
                                                        var span = [self_radial, Math.asin(child.des_span[0] / self_radial)];
                                                }
                                        } else {
                                                var span = to_Polar(to_Cartesian(child.des_span), [-self_radial, 0]);
                                                span[0] = Math.max(span[0], self_radial, child.des_span[0]);
                                        }
                                        child.self_span = [span[0], span[1]];
                                        angle_sum += span[1] + min_arc/span[0];
                                        if (span[0] > radial_sum) radial_sum = span[0];
                                }
                                var span2 = [radial_sum, angle_sum];
                                node.des_span = [Math.max(span1[0], span2[0]), span2[1]] //Math.max(span1[1], span2[1])];
                                if (span1[0] * span1[1] > node.des_span[0] * node.des_span[1]) {
                                        node.des_span[1] = (span1[0] * span1[1]) / node.des_span[0];
                                }

                                node.des_angle = span2[1];
                                if (node.des_span[1] > max_span[1]) 
                                        max_span = [[id], node.des_span[1]];
                                else if (node.des_span[1] == max_span[1])
                                        max_span[0].push(id);
                                if (node.des_span[1] > Math.PI) node.des_span[1] = Math.PI;
                        }
                        if (Math.PI >= max_span[1]) {
                                records.push(min_arc);
                                if (Math.PI < 1.05 * max_span[1]) break;
                        }
                        if (ite == 9) {
                                records.sort(function (r1, r2) {return (r2-r1);});
                                min_arc = records[0];
                        } else if (ite < 9) {
                                min_arc = (Math.PI / max_span[1]) * min_arc;
                        }
                }
                if (iteration==19) max_span[0] = [0];
                for (var ii in max_span[0]) {
                        id = max_span[0][ii];
                        _ite_assign(nodes[id], min_arc);
                }
                if (max_span[0] == 0) break;
        }
        // convert to cartesian
        nodes[0].polar = [0, 0];
        nodes[0].coordinates = [0, 0];
        coordinates = {};
        coordinates[nodes[0].id] = nodes[0].coordinates;
        for (var id=0; id < nodes.length; ++id) {
                var node = nodes[id];
                var self_radial = min_radial * Math.sqrt(node.size);
                coordinates[node.id] = node.coordinates;
                if (id > 0) {
                        var initial_angle = -node.des_angle, gap = 0;
                } else {
                        var initial_angle = 0, gap = Math.max(0, (Math.PI - node.des_angle) / node.children.length);
                }

                if (node.children) {
                        if (node.children.length > 2) {
                                node.children.sort(function(c1, c2) {return hashCode(c1.id) - hashCode(c2.id);});
                        }
                        for (var jd=0; jd < node.children.length; ++ jd) {
                                var child = node.children[jd];
                                var min_angle = node.spacing/child.self_span[0];
                                child.polar = [child.link.value + self_radial, initial_angle + child.self_span[1] + min_angle + node.polar[1]];
                                initial_angle += (child.self_span[1] + min_angle + gap)*2;
                                child.coordinates = to_Cartesian(child.polar);
                                child.coordinates[0] += node.coordinates[0], child.coordinates[1] += node.coordinates[1];
                        }
                }
                delete node.spacing, delete node.des_angle, delete node.des_span, delete node.polar, delete node.coordinates;

        }
        return coordinates;
}
_ite_assign = function(node, min_arc) {
        node.spacing = min_arc;
        if (node.children) {
                for (var i=0; i < node.children.length; ++i) {
                        child = node.children[i];
                        if (! child.spacing) {
                                _ite_assign(child, min_arc);
                        }
                }
        }
}
to_Cartesian = function(coord, center) {
    center = center===undefined?[0,0]:center;
    var r = coord[0], theta = coord[1];
    return [r*Math.cos(theta) + center[0], r*Math.sin(theta) + center[1]];
}
to_Polar = function(coord, center) {
    center = center===undefined?[0,0]:center;
    var x = coord[0] - center[0], y = coord[1] - center[1];
    return [Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)), Math.atan2(y, x)];
}




D3MSTree.prototype._start= function(callback,layout_data){
       var self = this;
       //add the links
       this.canvas.selectAll('g.link').remove();
       this.link_elements = this.canvas.selectAll('g.link').data(this.force_links, function(it){
                return it.source.id + "-" + it.target.id;
        });
        var link_enter = this.link_elements.enter().append('g').attr('id', function(it){
                return it.source.id + "-" + it.target.id;
        }).attr('class', "link mst-element");
        
        link_enter.call(this.force_drag)
        .on("mouseover",function(d){
        	if (! self.dragging) {
                for (var i in self.link_over_listeners){
                        self.link_over_listeners[i](d);    
                }
        	}
        })
        .on("mouseout",function(d){
                 for (var i in self.link_out_listeners){
                        self.link_out_listeners[i](d);       
                }
        }) ;
        //link_enter.append('line').style('opacity', '0.0').style('stroke-width', 10);
        link_enter.append('line');
        
        this.node_elements = this.canvas.selectAll('.node').data(this.force_nodes, function(it){
                return it.id;
        });
        
        //nodes
        this.node_elements.exit().remove();
        var new_node_elements = this.node_elements.enter().append('g').attr('class', "node mst-element").attr('id', function(it){
                return it.id;
        });
     
        //new_node_elements.append('text').attr('class', 'link-label').attr('text-anchor', 'middle').attr('font-size', '14px').attr('font-family', 'sans-serif').style('fill', 'gray').style('stroke', 'black').style('stroke-width', '.25px').style('opacity', 1).text(function(it){
         //       return it.id;
        //});
      
        new_node_elements.call(this.force_drag);
        
        //initially update all
        this.node_elements = this.canvas.selectAll('.node')
        this.links_to_display = this.link_elements.filter(function(e){return true;});
        this.nodes_to_display = this.node_elements.filter(function(e){return true;});
        this.d3_force_directed_graph.on('tick', function(){		
                if (self.update_graphics){
                        self._updateGraph();
                }		
        });
        
        this.svg.selectAll('.mst-element').sort(function(a, b){
                return d3.descending(a.value, b.value);
        });
		this.rendering_time=15;
        if (!layout_data){ 
                this.charge=-400;
                this._setLinkDistance();
                this.gravity=0;
                this.svg.style("display","none");
                this.startForce();
                //for some reason need to give random positions, otherwise leads to stack 
                for (var i in this.force_nodes){
                        var node=this.force_nodes[i];
                        node.x=Math.random()*1000;
                        node.y=Math.random()*1000;
               }
               
                this.update_graphics=false;
                callback(this,"Calculating Layout")
                setTimeout(function(){	
                        self._untangleGraph(true,self.rendering_time,callback);	
                },this.rendering_time+1000);
        
        }
        else{
                this.setLayout(layout_data);
                this._showLinkLabels();
                tmp_category = this.display_category;
             
                if (tmp_category) {
                        this.changeCategory(tmp_category);
                } else {
                        this.changeCategory('nothing');
                }
                this._updateGraph(true);
                this.startForce();
                this.stopForce();
                if (callback){
                        callback(this,"complete");
                }
        }
}

/**
* Collapses the nodes in the tree. If any link between two nodes is less than or
* equal to max_distance, the nodes will be collapsed into one.
* @param {number} max_distance All nodes equal or below this distance apart will be collapsed
* @param {boolean} keep_current_layout  If true then then the node psoitions will not be reset
*/
D3MSTree.prototype.collapseNodes= function(max_distance,keep_current_layout){
    var layout = JSON.parse(JSON.stringify(this.original_node_positions));
	if (keep_current_layout){
		for (var i in this.force_nodes){
			var node=this.force_nodes[i];
			 layout[node.id]  = [node.x,node.y];
	       }
	}      
    layout = this._collapseNodes(max_distance, layout, ! keep_current_layout);
	
    this._start(null,{"node_positions":layout,"scale":this.scale,"translate":this.translate});
	//if (!keep_current_layout){
	//	this.centerGraph();
	//}
    for (var i in this.treeChangedListeners){
		this.treeChangedListeners[i]("nodes_collapsed",this.node_collapsed_value);	
	}
}

D3MSTree.prototype._collapseNodes=function(max_distance,layout, redraw){
		var self = this;
		if (this.original_links.length > 50000) {
			this.original_links.sort(function(n1, n2) {return n2.distance-n1.distance});
		}
        //value is 0 reset original values to the current ones
		if ( this.node_collapsed_value <= 0 && ! this.manual_collapsing_value && layout ){
			this.force_nodes.forEach(function(node) {
				layout[node.id] = self.original_node_positions[node.id] = [node.x, node.y];
			});
		}
		if (max_distance > this.node_collapsed_value) {
			for(var id in this.manual_collapsing) {
				if (this.manual_collapsing[id] == 1) {
					delete this.manual_collapsing[id];
				}
			}
		}
//        if (max_distance<this.node_collapsed_value || (! this.force_nodes) || this.force_nodes.length == 0){
        if ( (! this.force_nodes) || this.force_nodes.length == 0 || redraw || max_distance<this.node_collapsed_value){
                this.clearSelection();
                this.hypo_record = {};
                this._addNodes(this.original_nodes);
                this._addLinks(this.original_links, this.original_nodes);
                for (var i in this.force_nodes){
					var node =this.force_nodes[i];
					if (layout && layout[node.id]){
						if (! node.x) node.x = layout[node.id][0];
						if (! node.y) node.y = layout[node.id][1];
					}
					this.hypo_record[node.id] = node.id;

					//add dummy metadata
					if (!this.metadata_map[node.id]) {
						this.metadata[node.id]= {"ID":node.id,"__Node":node.id};
						this.metadata_map[node.id]=[node.id];
					}
                }
                this.addMetadataOptions({
                	'nothing': 'No Category', 
                	'ID': 'ID',
                });
        }
        var to_collapse = JSON.parse(JSON.stringify(this.manual_collapsing));
  		this.manual_collapsing_value = Object.keys(this.manual_collapsing).length;
        if (this.manual_collapsing_value > 0) {
			var collapsed = 1;
			while (collapsed) {
				collapsed = 0;
				this.force_links.forEach(function(link) {
						var s_c = to_collapse[link.source.id] ? to_collapse[link.source.id] : 0;
						var t_c = to_collapse[link.target.id] ? to_collapse[link.target.id] : 0;
						if (s_c > t_c) {
								to_collapse[link.target.id] = s_c;
								collapsed = 1;
						}
				});
			}
        }

		var valid_label = {};
        for (var index=this.force_links.length-1; index >=0; index --) {
        		var l = this.force_links[index];
                if ( !l || (l.value > max_distance && to_collapse[l.source.id] !== 2) || (l.value && to_collapse[l.source.id] === 1) ) continue;
                if (l.source.hypothetical && ! valid_label[l.source.id]) {
                	if (! l.target.hypothetical) {
                		valid_label[l.source.id] = l.target.id;
                	} else if (valid_label[l.target.id]) {
                		valid_label[l.source.id] = valid_label[l.target.id];
                	}
                }
				this.hypo_record[l.target.id] = l.source.id;
        }
        for (var t_id in this.hypo_record) {
        	    var src_id = this.hypo_record[t_id];
			    while (this.hypo_record[src_id] !== src_id) {
                	src_id = this.hypo_record[src_id];
                }
				this.hypo_record[t_id] =src_id;
        }

        for (var index=this.force_links.length-1; index >=0; index --) {
                var l = this.force_links[index];
                        var id = l.target.id;
                        while (id != this.hypo_record[id]) {
                                id = this.hypo_record[id];
                        }
                this.hypo_record[l.target.id] = id;
                if (! valid_label[id] && valid_label[l.target.id]) {
                	valid_label[id] = valid_label[l.target.id];
                }
        }

        this.grouped_nodes = {};
        var new_force_nodes = {};
        for (var id in this.hypo_record) {
        	var grp = this.hypo_record[id];
        	if (valid_label[grp]) {
        		grp = this.hypo_record[id] = valid_label[grp];
        	}
        	if (! this.grouped_nodes[grp]) {
        		this.grouped_nodes[grp] = [];
        		new_force_nodes[grp] = {children:{}};
        	}
        	if (! id.startsWith('_hypo')) {
        		this.grouped_nodes[grp].push(id);
        	}
        }
        for (var id in this.force_nodes){
        	var node = this.force_nodes[id];
        	var grp = this.hypo_record[node.id];
			if (this.grouped_nodes[node.id]) {
				new_force_nodes[node.id].hypothetical = node.hypothetical;
				new_force_nodes[node.id].selected = node.selected;
				new_force_nodes[node.id].value = node.value;
				new_force_nodes[node.id].id = node.id;
			}
			if (node.parent && this.hypo_record[node.parent.id] !==grp) {
				new_force_nodes[grp].parent = new_force_nodes[this.hypo_record[node.parent.id]];
				new_force_nodes[grp].link = {
					source:new_force_nodes[grp].parent,
					target:new_force_nodes[grp],
					value: node.link.value, 
					original_value: node.link.original_value, 
				}
			}
			if (node.children) {
				var children_ids = node.children.filter(function(c) {
					return self.hypo_record[c.id] != self.hypo_record[node.id];
				}).map(function(c) {
					return self.hypo_record[c.id];
				}).forEach(function(id) {
					new_force_nodes[grp].children[id] = new_force_nodes[id];
				})
			}
        }
        var new_force_links = this.force_links.map(function(l) {
        	if (self.hypo_record[l.source.id] !== self.hypo_record[l.target.id]) {
        		return new_force_nodes[self.hypo_record[l.target.id]].link;
        	}
        }).filter(function(l) {
        	return l;
        });
        var new_force_nodes = this.force_nodes.map(function(n) {
        	var grp = self.hypo_record[n.id];
        	var n = new_force_nodes[grp];
        	if (n) {n.children = Object.values(n.children);}
        	delete new_force_nodes[grp];
        	return n;
        }).filter(function(n) {
        	return n;
        });
		this.force_links.length = 0;
		new_force_links.forEach(function(l) {
			self.force_links.push(l);
		});
		this.force_nodes.length = 0;
		new_force_nodes.forEach(function(l) {
			self.force_nodes.push(l);
		});
        this.node_collapsed_value=max_distance;

		this.node_map = {};
        for (var id in this.force_nodes) {
                var node = this.force_nodes[id];
                this.node_map[node.id] = node;
                for (var jd in this.grouped_nodes[node.id]) {
                		var n = this.grouped_nodes[node.id][jd];
                        this.node_map[n] = node;
                }
				var sub_ids= this.grouped_nodes[node.id];
				for (var i in sub_ids){
					var id = sub_ids[i];
					var meta_ids = this.metadata_map[id];
					for (var n in meta_ids){
						var meta_id= meta_ids[n];

						this.metadata[meta_id]["__Node"]=node.id;

					}
				}
                node.size = (node.hypothetical ? 0.01 : this.grouped_nodes[node.id].length);
        }
	//update the node to which the metadata is associated  
    this._updateNodeRadii();
	return layout;
};



D3MSTree.prototype._getLinkDistance = function(source_id,target_id){
        for (var i in this.force_links){
                var link = this.force_links[i];
                if (link.source.id == source_id && target_id == link.target.id){
                        return link.value;
                }      
        }
}





D3MSTree.prototype._untangleGraph = function(center,interval,callback){
        var self=this;
       
        interval =interval?interval:100
      
        this.startForce();
        setTimeout(function(){
                self.charge+=5;
                if (self.charge<200){
                        self.gravity=0;
                }
              
                if (self.charge>=-3){
                        self.charge=-3;
                        self.update_graphics=true;
                        self.startForce();
                        callback(self,"Drawing Tree");
                        setTimeout(function(){
                                self.svg.style("display","block");
                                self._drawNodes();
                        
                                self.stopForce();
                                self._fixAllNodes();
                                if (center){
                                        self._centerGraph();
                                }
                                 self._setLinkDistance();
             
                        for (var ii in self.force_links){
                                
                                self._correctLinkLengths(self.force_links[ii]);
                        
                        }
                        for (var ii in self.force_nodes){
                                var node= self.force_nodes[ii];
                                self.original_node_positions[node.id]=[node.x,node.y];
                        
                        }
                        self._showLinkLabels();
                        self._drawLinks();
                        self.changeCategory(self.display_category);
                        self._updateGraph(true);
                        //self.startForce();
                        if (callback){
                                callback(self,"complete");
                        }                        
                        },10);
                        return;                     
                }
                if (callback){
                        callback(self,"Refining Layout:"+(self.charge/5)*-1);
                }
                self.startForce();
                
                self._untangleGraph(center,interval,callback);
          
        },interval);
};

D3MSTree.prototype.startForce = function(use_node_force){
                var self=this;
		var link_strength=10;
                this.d3_force_directed_graph
                        .gravity(this.gravity)
                        .linkDistance(function(d){
                                return d.link_distance;
                        })
                        .charge(function(d){
                                if (use_node_force){
                                        return d.charge;
                                }
                                return self.charge;			
                        })
                        .linkStrength(link_strength)
                        .size([this.width, this.height])
                        .start();
};

D3MSTree.prototype.stopForce = function(){
        this.d3_force_directed_graph.stop();
};
        

/**
* @typedef {Object} LayoutData
* @property {object} node_positions A dictionary of node id to an array of x,y co-ordinate e.g.
* {node_a:[23,76],node_b:[65,75]}
* @property {object} node_links a dictionary of the following
* <ul>
* <li><b>max_link_length</b> The maxiumum length of a link . Any link over this distance
* will be corrected to this length and displayed as dotted.</li>
* <li><b>max_link_scale</b> Controls the length that each link is displayed. The links will be
* scaled (in pixels) between this value and 0 </li>
* <li><b>log_link_scale</b> If true - link length will be altered to the power of 0.8. Default is false </li>
* <li><b>link_font_size</b> The size in pixels of link labels. Default is 10 </li>
* <li><b>show_link_labels</b> Determines whether the distance labels on links are present. Default is false</li>
* <li><b>hide_link_length</b> All links over this length will not be displayed. Default is infinity </li>
* <li><b>base_node_size </b> The base size of the nodes. Default is 10 </li>
* <li><b>show_node_labels</b> Determines  whether node labels are present. Default true </li>
* <li><b>node_font_size</b> Controls the size (in pixels) of node labels. Default is 14 </li>
* <li><b>node_text_value</b> The category to display on the node label. Default is none (node id is shown) </li>
* <li><b>size_power</b> Controls the size of the nodes. Nodes, will have a radius which equal to number 
* of items associated with the node to the power of size_power multiplied by base_node_size
* Default value is 0.5 </li>
* <li><b>show_individual_segments</b> If true then every single component of the node will have its own 'wedge'
* even those in the same category (although they will be the same colour). Default is false.</li>
* <li><b>node_collapsed_value</b> Nodes connecting by links with a distance equal or below this value 
* will be collapsed. Default is 0</li>
* <li><b>custom_colours</b> A dictionary of categories to value/colour pairs e.g.
* {category1:{value_1:"blue",value_2:"red",..},"category_2":{....},...}
* <li><b>scale</b> The scale factor (1.0 being normal size)</li>
* <li><b>translate</b> The offset of the tree an array of x.y co-ordinate e.g. [30.-20] </b></li>
* </ul>
*/

/**
* Updates the tree with the supplied data. Any paramater not supplied will be default
* @param {LayoutData} layout _data - An  object describing the layout of the tree
*/


D3MSTree.prototype.setLayout = function(layout_data){
        if  (layout_data['node_positions']){
                for (var i in this.force_nodes){
                        var node = this.force_nodes[i];
                        var pos = layout_data['node_positions'][node.id];
                        var pos = pos ? pos : [0, 0];
                        node.px=node.x=pos[0];
                        node.py=node.y=pos[1];
                      
                }        
                this._fixAllNodes();
        }        
        if (layout_data['nodes_links']){
                var data = layout_data['nodes_links'];
                this.max_link_scale=data.max_link_scale?data.max_link_scale:500
                this.size_power=data['size_power']?data['size_power']:0.5;
                this.base_node_size=data.base_node_size;
                this.max_link_length = data.max_link_length?data.max_link_length:10000;
                this.log_link_scale = data['log_link_scale'];
                this.link_font_size = data['link_font_size']?data['link_font_size']:this.link_font_size
                this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]);
                this.show_link_labels =  data['show_link_labels'];
		        this.node_text_value=data['node_text_value'];
                this.node_font_size = data['node_font_size']?data['node_font_size']:this.node_font_size
                this.show_individual_segments=data['show_individual_segments'];
                this.show_node_labels= data['show_node_labels'] ? data['show_node_labels'] : false;
                this.hide_link_length= data["hide_link_length"]?data["hide_link_length"]:this.hide_link_length
                this.custom_colours = data['custom_colours']?data['custom_colours']:this.custom_colours;
                this.color_schemes.custom = data.custom_color_scheme ? data.custom_color_scheme : this.color_schemes.custom;
                this.backup = data.backup ? data.backup : null;
                this._updateNodeRadii();
                this._setLinkDistance();
                this.setLinkLength(this.max_link_scale);                                  
        }
        else{              
                this.setLinkLength(this.max_link_scale);
                this.setNodeSize(this.base_node_size);
        }
        var s=layout_data['scale']?layout_data['scale']:1;
        this.setScale(s);
        var translate = layout_data['translate']?layout_data['translate']:[0,0];
        this.setTranslate(translate);
        //this.startForce();
        this._drawLinks();
};

/**
* Returns the  data describing the current tree's layout
* @returns {LayoutData} layout _data Data describing the layout of the tree
*/
D3MSTree.prototype.getLayout=function(){   
        var node_positions={};
        for (var i in this.force_nodes){
                var node = this.force_nodes[i];            
                node_positions[node.id]=[node.x,node.y];
                this.grouped_nodes[node.id].forEach(function(d) {
                	node_positions[d] = [node.x, node.y];
                })
        }
        for (var node in this.original_node_positions){
                if (!node_positions[node]){
                        node_positions[node]=this.original_node_positions[node];
                }
        }
        var nodes_links = { 
			max_link_length:this.max_link_length,
			max_link_scale:this.max_link_scale,
			base_node_size:this.base_node_size,
			size_power:this.size_power,
			link_font_size:this.link_font_size,
			show_link_labels:this.show_link_labels,
			show_node_labels:this.show_node_labels,
			node_font_size:this.node_font_size,
			custom_colours:this.custom_colours,
			hide_link_length:this.hide_link_length,
			show_individual_segments:this.show_individual_segments,
			node_collapsed_value:this.node_collapsed_value,
			node_text_value:this.node_text_value,
			manual_collapsing:this.manual_collapsing,
			backup : this.backup,
			custom_color_scheme : this.color_schemes.custom, 
        };
        if (this.log_link_scale){
                nodes_links['log_link_scale']= "true";
        }
	
        return {node_positions:node_positions,
                        nodes_links:nodes_links,
                        scale:this.scale,
                        translate:this.translate,
			display_category:this.display_category
        };	
};

D3MSTree.prototype._drawLinks=function(){
        var self=this;
        this.link_elements.selectAll("line")
        .style('stroke', 'black')
        .style('opacity', function(it){
			return (it.value >= self.hide_link_length) ? '0.0' : '1.0';
        })
        .attr('stroke-dasharray', function(it){
            return (self.max_link_length && it.value > self.max_link_length) ? "3,5" : "";
        })
        .attr("stroke-width","3px");
        
        this.link_elements.selectAll(".distance-label").attr("font-size",this.link_font_size);
}


/**
* Toggles dispalying hypothetical nodes
* @returns {boolean} whether the hypothetical nodes are currently displayed
*/
D3MSTree.prototype.toggleHypotheticalNodes=function(){
	this.show_hypothetical_nodes = ! this.show_hypothetical_nodes;
	this._updateNodeRadii();
	this.changeCategory(this.display_category);

	this._setLinkDistance();
	for (var ii in this.force_links){
			this._correctLinkLengths(this.force_links[ii]);		
	}
	this._updateGraph(true);
	
	for (var i in this.displayChangedListeners){
		 this.displayChangedListeners[i]("show_hypothetical_nodes",this.show_hypothetical_nodes);	
	}
	return this.show_hypothetical_nodes;
}

/**
* Manually collapses/uncollapses the specified nodes
* @param {list} nodes A list of node ids to be collapsed/uncollapsed
* @param {boolean} uncollapse If true then the nodes will be uncollapsed
*/

D3MSTree.prototype.collapseSpecificNodes=function(nodes,uncollapse){
	var val = uncollapse?1:2
	for (var i in nodes) {
		var node=nodes[i];
		Object.keys(this.hypo_record).filter(function(k) {
			return self.hypo_record[k] == node;
		}).forEach(function(k) {
			self.manual_collapsing[k] = val;
		})
	}
	this.collapseNodes(this.node_collapsed_value,! uncollapse)	
}


/**
* Returns the ids of all the currently selected nodes
* @returns {list}An array of selected node ids
*/
D3MSTree.prototype.getSelectedNodeIDs=function(){
	var selected_nodes=[];
	for (var i in this.force_nodes){
		var node = this.force_nodes[i];
		if (node.selected){
			selected_nodes.push(node.id);
		}
	}
	return selected_nodes;
}


/**
* Changes the category displayed
* @param {string} category The category to display. If no category
* is given then the node IDs will be displayed
*/
D3MSTree.prototype.changeCategory= function(category){
        if (! category ){
                this.display_category=null;
                this.category_colours['missing']=this.default_colour;
        }
        this._changeCategory(category);
        
        var self = this;
        /*var hypo_nodes = this.node_elements.filter(function(d){return d.hypothetical})
        	.selectAll("circle").data(function(parent){
        		return [{cx:parent.x,cy:parent.y}];
            });
    
        hypo_nodes.enter().append("circle").attr("r",0).style("fill","black");*/
        
        var nodes_existing = this.node_elements//.filter(function(d){return !d.hypothetical})
								.selectAll('.node-paths').data(function(it){
										return self._getPieData(it, category);
								});
        nodes_existing.enter().append('path').classed("node-paths",true);
        nodes_existing.exit().remove();
        

       this.node_elements.selectAll('.node-paths').on("mouseover",function(d, ui){
                for (var i in self.segment_over_listeners){
                        self.segment_over_listeners[i](d);    
                }
        }).on("mouseout",function(d, ui){
                 for (var i in self.segment_out_listeners){
                        self.segment_out_listeners[i](d);    
                }
        }).style("stroke","black");      
        this._drawNodes();
        this._setNodeText();
}


D3MSTree.prototype._drawNodes=function(){
        var self = this;
        this.node_elements.selectAll('.node-paths').attr('d', this.arc).attr('fill', function(it){
                return self.category_colours[it.data.type] ? self.category_colours[it.data.type] : self.default_colour;
        });
        this.node_elements.selectAll('.halo')
                .attr("d",function(d){                  
                       var r  = self.node_radii[d.id];
                        var arc = d3.svg.arc().innerRadius(r).outerRadius(r+d.halo_thickness).startAngle(0).endAngle(2 * Math.PI);
                        return arc();
                })
                .attr("fill",function(d){
                        return d.halo_colour;
                });
};

/**
* Alters the length of the link to the supplied value
* @param {object} link  The link object to alter
* @param {number} length The new length of thr link
*/
D3MSTree.prototype.setIndividualLinkLength= function(link,length){
	link.value=length;
	this._setLinkDistance();
	this._correctLinkLengths(link);
	this._updateGraph(true);
	
}


/** Returns the tree as an object {@link InitialData}, suitiable for use in the trees constructor
* @returns {InitialData} An object descibing the tree
*/

D3MSTree.prototype.getTreeAsObject=function(){
        var obj = {
                links:this.original_links,
                nodes:this.original_nodes,
                layout_data:this.getLayout(),
                metadata:this.metadata,
                initial_category:this.display_category,
                category_num:this.category_num,
		newickTree:this.newickTree,
		metadata_options:this.metadata_info
        }
        return obj;

}

D3MSTree.prototype.getTreeAsNewick=function(){
	return this.newickTree;
}

D3MSTree.prototype._setNodeText = function(){
        var self=this;
        var field =this.node_text_value;
        this.node_elements.selectAll('text').remove();
        if (! this.show_node_labels){
                return;
        }
        var node_text = this.node_elements.filter(function(d){
                return (!d.hypothetical || self.show_hypothetical_nodes);
        }).
        append('text').attr('class', 'node-group-number').
        attr('dy', ".71em").attr('text-anchor', 'middle').attr('font-size', this.node_font_size).
        attr('font-family', 'sans-serif').attr('transform', function(it){
                return "translate(0," + -self.node_font_size / 3 + ")";
        }).text(function(it){                
                if (field && field !== "node_id"){
                        var meta_ids = self.metadata_map[it.id];
                        if (meta_ids){
                                var display = self.metadata[meta_ids[0]][field];
                                return display?display:"ND"; 
                        }
                    
                        else{
                                return "ND";
                        }                    
                }
                return  it.id
        });
};

D3MSTree.prototype.delOtherNodes = function(nodes) {
	var nn = {};
	var self = this;
	nodes.forEach(function(n){self.grouped_nodes[n].forEach(function(x) {nn[x]=1});});
	this.delNodes(this.original_nodes.filter(function(n){return ! nn[n];}));
}

D3MSTree.prototype.undeleteNodes = function() {
	var self = this;
	if (self.backup) {
		self.original_nodes = JSON.parse(JSON.stringify(self.backup.nodes));
		self.original_links = JSON.parse(JSON.stringify(self.backup.links));
		self.manual_collapsing = JSON.parse(JSON.stringify(self.backup.manual_collapsing));
		var selected = {}
		self.force_nodes.filter(function(n) {return n.selected}).forEach(function(n) {selected[n.id] = 1;});
		self.force_nodes.length = self.force_links.length = 0;
		this.original_node_positions = this.backup.original_positions;
		this.node_collapsed_value = this.backup.node_collapsed_value;
		this._collapseNodes(this.node_collapsed_value);
		self.force_nodes.forEach(function(n) {
			if (selected[n.id]) {
				n.selected = true;
			}
		})

		this._updateSelectionStatus();

		this._start(null,{"node_positions":self.backup.positions,"scale":this.scale,"translate":this.translate});
		self.backup = null;
	}
}

D3MSTree.prototype.delNodes = function(nodes) {
	var self =this;
	var layout = {}
	this.force_nodes.forEach(function(node) {
		layout[node.id] = [node.x, node.y];
	});

	if (!self.backup) self.backup = {};
	if (!self.backup.links) self.backup.links = JSON.parse(JSON.stringify(self.original_links));
	if (!self.backup.nodes) self.backup.nodes = JSON.parse(JSON.stringify(self.original_nodes));
	if (self.backup.nodes.length === self.original_nodes.length) {
		self.backup.node_collapsed_value = this.node_collapsed_value;
		self.backup.manual_collapsing = JSON.parse(JSON.stringify(self.manual_collapsing));
		self.backup.original_positions = JSON.parse(JSON.stringify(self.original_node_positions));
		self.backup.positions = JSON.parse(JSON.stringify(layout));
	}

	var nodesToDel = {};
	nodes.filter(function(n) {
		return ! n.startsWith('_hypo');
	}).forEach(function(n) {
		nodesToDel[n] = 1;
		if (self.grouped_nodes[n]) {
			self.grouped_nodes[n].forEach(function(nn) {
				nodesToDel[nn] = 1;
			});
		}
	});

	var nodes = this.original_nodes.map(function(n) {
		return {
			id : n, 
			hypothetical : n.startsWith('_hypo'),
			children : [], 
			parent : null,
		}
	});

	this.original_links.forEach(function(l) {
		var s = l.source,
			t = l.target;
		nodes[s].children.push(nodes[t]);
		nodes[t].parent = nodes[s];
		nodes[t].link_length = l.distance > 0 ? l.distance : 0;
	});

	var todel = 1;
	while (todel) {
		todel = 0;
		nodes.forEach(function(n) {
			n.children = n.children.filter(function(c) {
					return ! nodesToDel[c.id];
			});
			if (n.parent && nodesToDel[n.parent.id]) {
				n.parent = null;
			}
			var n_child = n.children.length,
				n_parent = n.parent ? 1 : 0;
			if (n.hypothetical && ! nodesToDel[n.id]) {
				if (n_child + n_parent <= 1) {
					nodesToDel[n.id] = 1;
					todel = 1;
				} else if (n_parent === 1 && n_child === 1) {
					nodesToDel[n.id] = 1;
					todel = 1;
					n.children[0].link_length += n.link_length;
					n.children[0].parent = n.parent;
					n.parent.children.push(n.children[0]);
				}
			}
		});
	}
	self.force_nodes.length = self.force_links.length = 0;

	var index = 0;
	nodes = nodes.filter(function(n) {
		if (! nodesToDel[n.id]) {
			n.index = index;
			index += 1;
			return true;
		} 
		return false;
	})
	self.original_nodes = nodes.map(function(n) {
		return n.id;
	});
	self.original_links = nodes.filter(function(n) {
		return n.parent;
	}).map(function(n) {
		return {
			source : n.parent.index,
			target : n.index,
			distance : n.link_length,
		}
	});
	self.backup.curr_links = JSON.parse(JSON.stringify(self.original_links));
	self.backup.curr_nodes = JSON.parse(JSON.stringify(self.original_nodes));

	this.max_link_distance = self.original_links.map(function(l) {return l.distance;}).reduce(function(v1, v2) {
		return v1 > v2 ? v1 : v2;
	});
	this._collapseNodes(this.node_collapsed_value);
	this._start(null,{"node_positions":layout,"scale":this.scale,"translate":this.translate});
}


D3MSTree.prototype._calculateArc=function(){
        var self=this;
        return d3.svg.arc().outerRadius(function(it){
               return self.node_radii[it.data.idx];
        }).innerRadius(0);

}


D3MSTree.prototype._getPieData = function(d, category){
        var results =[];
	/*if (d.hypothetical  && this.show_hypothetical_nodes){
		return this.pie([{
		value: 1,
                        type: 'missing',
                        idx:d.id
		
		}]);
	
	}*/
        if (category){
                //get all nodes assocaited with the master
                var node_ids = this.grouped_nodes[d.id];
                //get all the strains 
                var strains=[];
                for (var i in node_ids){
                        var id= node_ids[i];
                        if (this.metadata_map[id]){
                                strains = strains.concat(this.metadata_map[id]);
                        }
                        else{
                               strains.push("missing");
                        }
                }
                var type_counts={}
                for (i in strains) {
                        strain = strains[i];
                       
                        if (strain == "missing") {
                              var missing = type_counts['missing']
                                if (!missing){
                                        type_counts['missing']=1;                                
                                }
                                else{
                                        type_counts['missing']++;   
                                }   
                        }
                        else {
                                strain_metadata = this.metadata[strain];
                                var value = strain_metadata[category];                  
                                if (!value){
                                        var missing = type_counts['missing']
                                        if (!missing){
                                                type_counts['missing']=1;                                
                                        }
                                        else{
                                                type_counts['missing']++;   
                                        }
                                }
                                else{
                                        var count = type_counts[value];
                                        if (!count){
                                                type_counts[value]=1;
                                        }
                                        else{
                                                type_counts[value]++;
                                        } 
                                }
                        }
                }
                for (var type in type_counts){
                        var count = type_counts[type];
                        if (this.show_individual_segments){
                                for (var n=0;n<count;n++){
                                                results.push({
                                                value: 1,
                                                type: type,
                                                idx: d.id
                                        });
                                }
                        }
                        else{
                                results.push({
                                        value: count,
                                        type: type,
                                        idx: d.id
                                });        
                        } 
                }
        }
        else{
                if (this.show_individual_segments){
                        var strains = this.grouped_nodes[d.id];
                        for (var i in strains){
                                results.push({
                                        value:1,
                                        type:"node_name",
                                        idx:d.id,
                                        node_id:strains[i]
                                        
                                });
                        }
                }
                else{
                        results=[{
                                value:this.grouped_nodes[d.id].length,
                                type:'missing',
                                idx:d.id               
                        }];
                }
        }
        if (results.length == 0) {
                results = [{
                        value: 1,
                        type: this.metadata[d.id][category] ? this.metadata[d.id][category] : 'missing',
                        idx:d.id
                }];
        }
        return this.pie(results);
};

//change position
D3MSTree.prototype._updateGraph = function(all){
        var links  = this.links_to_display;
        var nodes = this.nodes_to_display;
        if (all){
                links = this.link_elements;
                nodes = this.node_elements;
        
        }
        links.selectAll('text').attr('x', function(it){
                
                return (it.source.x + it.target.x) / 2.0;
                
        }).attr('y', function(it){
                return (it.source.y + it.target.y) / 2.0;
        });
        
        links.selectAll('line').attr('x1', function(it){
                return it.source.x;
        }).attr('y1', function(it){
                return it.source.y;
        }).attr('x2', function(it){
                return it.target.x;
        }).attr('y2', function(it){
                return it.target.y;
        });
        
        nodes.attr('transform', function(it){
                return "translate(" + it.x + "," + it.y + ")";
        });
}

D3MSTree.prototype._updateNodeRadii=function(data){
        if (! data) {
                data = this.node_radii;
        }
        for (var i in this.force_nodes){
                node = this.force_nodes[i];
                var radius =0;
                if (!node.hypothetical){
                        var len=0;
                        var arr = this.grouped_nodes[node.id];
                        for (var ii in arr){
                               var meta=this.metadata_map[arr[ii]];
                               if (meta){
                                        len+=meta.length;
                               }
                               else{
                                        len++;
                               }
                        }
                        radius =  Math.pow(len, this.size_power)*this.base_node_size;
                } else if (this.show_hypothetical_nodes) {
					radius = Math.pow(0.25, this.size_power)*this.base_node_size;
				}
                data[node.id]=radius;
        }
    
}

D3MSTree.prototype._addNodes=function(ids){
        this.force_nodes.length=0;
        if (ids.length < 4){
                this.gravity=0.02;
        }
        
        for ( var i = 0;i < ids.length; i++) {
                var id = ids[i];
                if (id === "hypothetical_node"){
                        id = ids[i] = "_hypo_"+i;
                }
                var node = {
                      id:id,
                      value:-1,
                      selected:false,
                      children : [],
                      parent : null,
                };
                 if (id.startsWith("_hypo_")){
                        node.hypothetical = true;
                 }
                
                this.force_nodes.push(node);    
        }
}

//update node sizes in case nodes represent more than one entity
D3MSTree.prototype.addMetadata=function(metadata){
        D3BaseTree.prototype.addMetadata.call(this,metadata);
        if (this.original_nodes){
                this.setNodeSize(this.base_node_size);
        }
        

}


D3MSTree.prototype._addLinks=function(links,ids){
	   var self = this;
	   this.force_links.length=0;
	   var new_links = links.map(function(link) {
			return {
				value:link['distance'] > 0 ? link['distance'] : 0, 
				source : ids[link.source], 
				target : ids[link.target], 
			};
	   })
	   this.link_distances = {};
	   this.max_link_distance= new_links.map(function(l){
		   	return l.value
	   })
	   .reduce(function(v1, v2) {
	   		return v1 > v2 ? v1 : v2;
	   });
	   var _findNode = {};
		this.force_nodes.forEach(function(n) {
			_findNode[n.id] = n;
		});

	   for (var id in new_links) {
		   	var x = new_links[id];
			var target_node = _findNode[x.target];
			var source_node = _findNode[x.source];
			if (! source_node.children) source_node.children = [];
			source_node.children.push(target_node);
			target_node.parent = source_node;
			this.force_links.push( {
					   source: source_node,
					   target: target_node,
					   value: x.value,
					   original_value:x.value,
			});
	   }
	   this.force_links.forEach(function(l) {
	   		l.target.link = l;
	   });

		this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]);
}
D3MSTree.prototype._getLink=function(target_node){
        for (var index in this.force_links){
                if (this.force_links[index].target.id === target_node.id){
                        return this.force_links[index];
                }        
        }
}


 D3MSTree.prototype._setLinkDistance=function(strict){
        var self= this;
        var min_link_distance = Math.min.apply(Math, this.force_links.map(function(d) {return d.original_value}));
        var max_link_distance = this.max_link_distance;
        var log_adjust1 = Math.log(self.distance_scale(min_link_distance))-1.0;
		var log_adjust2 = self.distance_scale(max_link_distance)/(Math.log(self.distance_scale(max_link_distance)) - log_adjust1);
        this.link_elements.each(function(d){			
			var length =  self.node_radii[d.source.id] + self.node_radii[d.target.id];
			if (strict) d.value=d.original_value;

			var line_len = d.value;
			if (self.max_link_length && line_len>self.max_link_length){
				line_len=self.max_link_length;
			}
			if (self.log_link_scale){
				length = (Math.log(self.distance_scale(line_len)) - log_adjust1)*log_adjust2+length;
			}
			else{
					length = self.distance_scale(line_len)+length;
			}
			d.link_distance=length;		
        });
 };
 
 D3MSTree.prototype.refreshGraph = function(callback, no_greedy){
		if (! no_greedy) {
			layout = this.greedy_layout(this.force_nodes, this.max_link_scale, this.base_node_size);
		} else {
			layout = this.original_node_positions;
		}
        this._updateNodeRadii();
        this._start(callback,{"node_positions":layout,"scale":this.scale,"translate":this.translate});
        this.centerGraph();
}

D3MSTree.prototype._centerGraph = function(){
        var maxX = this.force_nodes[0].x, minX = this.force_nodes[0].x;
        var maxY = this.force_nodes[0].y, minY = this.force_nodes[0].y;
        var nodes = this.force_nodes;
        for (var n in nodes){
                var node = nodes[n];
                if (node.x>maxX){maxX=node.x;}
                else if (node.x<minX){minX=node.x;}
                if (node.y>maxY){maxY=node.y;}
                else if (node.y<minY){minY=node.y;}
                                
        }   
        var [wdiff, hdiff] = [Math.max(100, maxX-minX), Math.max(100, maxY-minY)];
		var scale = Math.min(this.width/wdiff, this.height/hdiff)*0.8;
		var [newX, newY] = [(this.width*1.0/scale - wdiff)/4.0, (this.height*1.0/scale - hdiff)/2.0];
		

        for (var n=0;n<nodes.length;n++){
                var node = nodes[n];
                node.px =node.x = node.x-minX + newX;
                node.py = node.y = node.y-minY + newY;
        }

        this.setScale(scale);
        this.setTranslate([0,0]);
        this.updateScaleDiv();
}
 
D3MSTree.prototype.centerGraph = function(){
        this._centerGraph();
        this._updateGraph(true);
}
//public methods
D3MSTree.prototype.setLogLinkScale=function(log){
        this.log_link_scale = log;
        this._setLinkDistance();
        for (var ii in this.force_links){
                this._correctLinkLengths(this.force_links[ii]);		
        }
        //this._updateGraph(true);  
		this.refreshGraph();
}



D3MSTree.prototype.clearSelection= function(pervasive){ 
    if (! pervasive) {
	   this.force_nodes.filter(function(node){node.selected=false; delete node.halo_thickness; delete node.halo_colour;});

	   if (this.node_elements) {
			this.node_elements.classed('selected', false);
			this.node_elements.selectAll(".halo").remove();
	   }
	} else {
		this.node_elements.filter(function(node){return ! node.selected})
		.filter(function(node){delete node.halo_thickness; delete node.halo_colour;return true;})
		.classed('selected', false).selectAll('.halo').remove();
	}
	for (var i in this.nodesSelectedListeners){
		this.nodesSelectedListeners[i](this);
	}
};

/**
Sets the maximum length of any link. Any links over the value supplied
will be reduced to the maximum length and displayed as dotted lines
@param {number} amount The maximum link length
*/
D3MSTree.prototype.setMaxLinkLength=function(amount){
        var self=this;
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <=0){
                amount = null;
        }
        this.max_link_length=amount;
        this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]).clamp(true);
        this._setLinkDistance();
        this._drawLinks();
                
        for (var ii in this.force_links){
                this._correctLinkLengths(this.force_links[ii]);		
        }
        this._updateGraph(true);
};

/** Sets the relative length of the all links.
* @param {integer} max_length - This  specifies length of longest  link in pixels
* All other links will be scaled between this value and 1
*/
D3MSTree.prototype.setLinkLength=function(max_length){		
        this.max_link_scale=max_length;
        this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,max_length]);
        this._setLinkDistance();
        if (this.fixed_mode){
                this.stopForce();        
                for (var ii in this.force_links){
                        this._correctLinkLengths(this.force_links[ii]);
                                
                }
                this._updateGraph(true);
        }
        //this.startForce();		
};
/** Sets the font size of the links
* @param {integer} The font size (in pixels)
*/
D3MSTree.prototype.setLinkFontSize = function(size){
        this.link_font_size=size;
        this.link_elements.selectAll('.distance-label').transition()
                                        .attr('font-size',this.link_font_size+"px");
};

/** 
Resets all link lenghts to accurately reflect the original value.
*/
D3MSTree.prototype.resetLinkLengths=function(){
        this._setLinkDistance(true);
        this.stopForce();        
		for (var ii in this.force_links){
				var link = this.force_links[ii];
				link.value = link.original_value;
				this._correctLinkLengths(this.force_links[ii]);                              
		}
		this._updateGraph(true);
};


/** Determines whether to show distance labels on links
* @param {boolean} show true or false
*/
D3MSTree.prototype.showLinkLabels = function(show){
        this.show_link_labels = show;       
        this._showLinkLabels();
};


D3MSTree.prototype._showLinkLabels = function(){
        var self=this;
        this.link_elements.selectAll('text').remove();
        if (! this.show_link_labels){
                return;
        }
        this.link_elements.append('text').attr('class', 'distance-label').
                                        attr('dy', ".71em").attr('text-anchor', 'middle').
                                        attr('font-size', this.link_font_size).attr('font-family', 'sans-serif').
                                        style('fill', 'gray').style('stroke', 'white').style('stroke-width', '5px').style('opacity', '0.9').
                                        text(function(it){
                                                 return it.original_value >= 1 ? Math.floor(it.original_value) : it.original_value.toPrecision(2);
                                        });
        this.link_elements.append('text').attr('class', 'distance-label').
                                        attr('dy', ".71em").attr('text-anchor', 'middle').
                                        attr('font-size', this.link_font_size).attr('font-family', 'sans-serif').
                                        style('fill', '#666666').style('stroke', '#f0f0f0').style('stroke-width', '.2px').
                                        text(function(it){
                                                 return it.original_value >= 1 ? Math.floor(it.original_value) : it.original_value.toPrecision(2);
                                        });

        this.link_elements.selectAll('text').attr('x', function(it){
                return (it.source.x + it.target.x) / 2.0;
                
        }).attr('y', function(it){
                return (it.source.y + it.target.y) / 2.0;
        });
     
}


/** Sets the base node size. The radius of the node is calculated by the
* log of the number of items represented by the node multipled by base node size
* @param {number} node_size The base node size
*/
D3MSTree.prototype.setNodeSize = function(node_size){
        this._updateNodeRadii(this.previous_node_radii);
        this.base_node_size=node_size;	 
        this._updateNodeRadii();
        this._nodeSizeAltered();
       
};


/** Sets the relative node size. Default is 0.5, The smaller the number, the smaller
* nodes will be that represent many items
* @param {number} factor The size_power value used in node size calculation
*/
D3MSTree.prototype.setRelativeNodeSize = function(factor){
        this._updateNodeRadii(this.previous_node_radii);
        this.size_power=factor;
        this._updateNodeRadii();
        this._nodeSizeAltered();
      
};

D3MSTree.prototype._nodeSizeAltered= function(){
        var self = this;
        for (var i in this.force_links){
                var link =this.force_links[i];
                var prev_length =  self.previous_node_radii[link.source.id] + self.previous_node_radii[link.target.id];
                var current_length = self.node_radii[link.source.id] + self.node_radii[link.target.id];
                link.link_distance = link.link_distance -prev_length+ current_length
        
        }
         for (var ii in this.force_links){
                       this._correctLinkLengths(this.force_links[ii]);		
        }
        this._drawNodes()
        this._updateGraph(true);
        
        
};



/**
Returns all the selected IDs of the selected node
* @returns {list} All the selected IDs, these may be the ids of the nodes or
* if the node is assocaited with items, the ID of all the items in the node
*/
D3MSTree.prototype.getSelectedIDs=function(){
        var selected = [];
        for (i = 0; i<this.force_nodes.length;i++) {
                var node = this.force_nodes[i];
                if (node.selected){
                        selected=selected.concat(this._getIDsForNode(node.id));
                }
        }
        ret_list=[]
        for (var i in selected){
                var id = selected[i];
                if (!isNaN(id)){
                        id = parseInt(id);
                }
                ret_list.push(id);
        
        }
        return  ret_list;
}




/** If true each individual item in the node will have its own 'wedge' even if it 
* is the same category (although it is the same colour). This useful to guage the
* size of the node, but if nodes represent 100's of items, will slow down the
* rendering of the tree
* @param {boolean} true or false
*/
D3MSTree.prototype.showIndividualSegments= function(show){
        this.show_individual_segments=show;
        this.changeCategory(this.display_category);
        this._drawNodes();

};



/** Sets the size of node labels in pixels
* @param {number} node label font size in pixels
*/
D3MSTree.prototype.setNodeFontSize = function(size){
        this.node_font_size=size;
        this._setNodeText();
};

/**
* Sets the label to display on the node.
* @param {string} value The name of a the category whose values will be displayed.
* if 'node_id' is given then the node id will be displayed.
*/
D3MSTree.prototype.setNodeText = function(value){
        this.node_text_value = value;
        this._setNodeText();
};

/**
* Determines wheteher node labels will be present
* @param {boolean} show Either true or false
*/
D3MSTree.prototype.showNodeLabels = function(show){
        this.show_node_labels= show;
        this._setNodeText();
};


/**
* If nodes are unfixed (i.e. they are being positioned by the force algorithm)
* the supplied value specifies the repelling force between each node
* @param {number} amount the repelling force between each node (or attraction if amount is posotive)
*/
D3MSTree.prototype.alterCharge=function(amount){
        this.charge = amount*-1;
        this.startForce();
};


D3MSTree.prototype._correctLinkLengths= function(it){
        var source = it.source;
        var target =it.target;
        if (target.x == source.x && target.y == source.y) {
        	target.x += it.link_distance/1.4142135623730950488016887242097;
        	target.y += it.link_distance/1.4142135623730950488016887242097;
        }
        var x_dif = target.x - source.x;
        var y_dif = target.y - source.y;
        var actual_length = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));
        var factor = it.link_distance/actual_length;
        var old_x = target.x;
        var old_y = target.y;	
        target.px = target.x = source.x+(x_dif*factor);
        target.py = target.y = source.y+(y_dif*factor);	
        this._alterChildrenPosition(target,target.x-old_x,target.y-old_y);
}


D3MSTree.prototype._addHalos= function (filter_function,thickness,colour){
        var self = this;
        var halos = self.node_elements.filter(filter_function)
                .append("path")
                .attr("class","halo")
                .attr("d",function(d){
                        d.halo_thickness = thickness;
                        d.halo_colour=colour;
                        var r  = self.node_radii[d.id];
                        var arc = d3.svg.arc().innerRadius(r).outerRadius(r+thickness).startAngle(0).endAngle(2 * Math.PI);
                        return arc();
                })
                .attr("fill",colour);
        
         self.node_elements.sort(function(a,b){
         	if (a.halo_thickness) {
         		if (b.halo_thickness) {
         			return (a.halo_thickness == b.halo_thickness) ? 0 : (a.halo_thickness > b.halo_thickness ? -1 : 1);
         		} else {
         			return 1;
         		}
         	} else if (b.halo_thickness) {
         		return -1;
         	}
             return 0;
         });
  
}



D3MSTree.prototype._getActualLinkLength= function(link){
        var source  = link.source;
        var target = link.target;
        var x_dif = target.x-source.x;
        var y_dif = target.y - source.y;
        return Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));
}


D3MSTree.prototype._tagAllChildren=function(node,state){
        if (!node.children){
                return;
        }
        for (var x in node.children){
                child = node.children[x];
                child.tagged=state;
                this._tagAllChildren(child,state);
        }
}

//will only update the nodes which have the property specified
D3MSTree.prototype._updateNodesToDisplay = function(tag){
        if (!tag){
                tag= 'fixed';
        }
        this.links_to_display = this.link_elements.filter(function(e){
                return (e.target[tag] || e.source[tag]);
        });
        this.nodes_to_display = this.node_elements.filter(function(e){
                if (e[tag]){
                        return true;
                }
                return false;
        });

}

/** This will cause all nodes to be acted upon by the 'force' algorithm
* and will alter their position. Nodes will spread out and link lengths
* may no longer be accurate
* @param {boolean} all If true all nodes will be released, otherwise just
* the selected ones
*/
D3MSTree.prototype.unfixSelectedNodes= function(all){
        for (i = 0; i<this.force_nodes.length;i++) {
        var node = this.force_nodes[i];
                if (node.selected || all){
                        node.fixed=false;
                        node.selected=false;
                        node.update=true;
                }		
        }
        //get rid of selection
        if (! all){
                this._drawNodes();
        
        }
        this._updateNodesToDisplay("update")
        this.fixed_mode=false;
        this.startForce(true);
}

/** This fixes all nodes and stops the 'force' algorithm from updating
* their position
*/
D3MSTree.prototype.fixAllNodes=function(resetLength){
        this.stopForce();
        for (var index in this.force_nodes){
                var node = this.force_nodes[index];   
                        node.fixed=true;
                        node.update=false;			
        }
        for (var ii in this.force_links){
                var link = this.force_links[ii];
                var link_distance = this._getActualLinkLength(link);
                link.link_distance= link_distance;
                var value = link_distance-this.node_radii[link.source.id]-this.node_radii[link.target.id];
                link.value = this.distance_scale.invert(value)
                                
        }
        this._setLinkDistance();
        this.fixed_mode=true;
        this._updateGraph(true);	
        //this.change_nodes_to_update();
        //this.startForce();
        if (resetLength == true) {
			this.resetLinkLengths();
		}

}

 
D3MSTree.prototype._fixAllNodes = function(){            
        for (var i in this.force_nodes) {
                node = this.force_nodes[i];
                node.fixed = true;
                node.charge=-30;
        }
        this.links_to_display = this.link_elements.filter(function(e){return false;});
        this.nodes_to_display = this.node_elements.filter(function(e){return false;});
        this.node_elements.classed('fixed', true);
};


D3MSTree.prototype._alterChildrenPosition =function(node,x_diff,y_diff){
                for (var id in node.children){
                        var child = node.children[id];
                        child.x+=x_diff;
                        child.y+=y_diff;
                        child.px=child.x;
                        child.py=child.y
                        this._alterChildrenPosition(child, x_diff, y_diff);
                }
        
}

D3MSTree.prototype._rotateChildren =function (node,angle_change,center){
        if (!node.children){
                return;
        }
        for (var x in node.children){
                        child = node.children[x];
                        var x1 = child.x- center.x;
                        var y1 = child.y- center.y;
                        var child_radius = Math.sqrt((x1*x1)+(y1*y1));
                        var child_angle = Math.atan2(y1,x1);
                        var new_angle = child_angle+angle_change;
                        x_offset = Math.cos(new_angle)*child_radius;
                        y_offset  = Math.sin(new_angle)*child_radius;			
                        child.x=center.x+x_offset;
                        child.y=center.y+y_offset;
                        child.px=child.x;
                        child.py=child.y
                        this._rotateChildren(child,angle_change,center);
        }

}


/** Hides all links which have a length above the value supplied
* @param {number} max_length The length above which links will be hidden
*/
D3MSTree.prototype.setHideLinkLength=function(max_length){
        this.hide_link_length=max_length;
        this._drawLinks();
};


D3MSTree.prototype._unfixAllChildNodes=function(node,count){
        if (!node.children){
                return;
        }
        if (count===4){
                return;		
        }
        if (count){
                count++;
        }
        else{
                for (var x in node.children){
                        child = node.children[x];
                        child.fixed= false;
                        child.charge=0;
                        this.unfixAllChildNodes(child,count);
                        
                }
        }

};	
   

D3MSTree.prototype._getIDsForNode= function(node_id){
        var ids=[];
        var group = this.grouped_nodes[node_id];
        for (var ii in group){
              var list = this.metadata_map[group[ii]];
              if (list){
                      ids = ids.concat(list);
              
              }
              else{
                      ids.push(group[ii]);
              }
        }
        return ids;
};

/** All nodes which contain metadata that has  ID in is the supplied list 
* will have a large halo around them.
* @param {list} IDs A list of IDs to higlight, the IDs will be either be the IDs
* of items associated with a node or the id of the node (if a one to one relationship)
* Even if only one ID is present in the node, then the whole node will be highlighted.
* @param {string} color The color of the halo (default yellow)
*/
D3MSTree.prototype.highlightIDs = function (IDs,color){
       this.clearSelection();
       var self = this;
       if (!color){
		color="yellow"
       }
       this._addHalos(function(d){
                        var group = self._getIDsForNode(d.id)
                        for (var i=0;i<IDs.length;i++){
                                if (group.indexOf(IDs[i]) !== -1){
                                        return true;
                                }
                        }
                        return false;

        },10,color);
      
}


/** All nodes with the id in supplied list will have a large yellow
* halo around them.
* @param {list} IDs A list of nodes  IDs to higlight, 
* @param {string} color The color of the halo (default yellow)
*/
D3MSTree.prototype.highlightNodes = function(node_ids,color){
	this.clearSelection();
	var self = this;
	if (!color){
		color="yellow"
	}
	this._addHalos(function(d){
		if (node_ids.indexOf(d.id)!==-1){
			return true;
		}
		return false;

        },10,color);

}
D3MSTree.prototype._tagParent = function(it, flag) {
           if (it.parent) {
               it.link.tracked = flag;
               return this._tagParent(it.parent, flag);
           }
       };


//Dragging Functions
D3MSTree.prototype._dragStarted= function(it, pos){
	var self= this;
       if (! this.fixed_mode){
              return;
       }
      this.dragging = true;
       this.stopForce();
       if (!it.parent) {
               var parent = it.children[0];
               this.drag_link = parent ? this._getLink(parent) : null;
       } else {
               var parent = it.parent;
               this.drag_link =this._getLink(it);
       }
       if (!this.drag_link){
              this.drag_orig_xy=[it.x,it.y];
              return;
       }

       it.fixed=true;
       it.tagged=true;
       //tag all children and highlight        
       this._tagParent(it, true);
       this._tagAllChildren(it,true);         
       this.node_elements.filter(function(node){
              return node.tagged;
       }).selectAll(".node-paths").style("stroke","#ff9900").attr("stroke-width","3px");
       this.link_elements.selectAll("line").filter(function(lnk) {
       	return lnk.tracked;
       }).style("stroke","#A0A0A0");
       this._updateNodesToDisplay("tagged");
       
		if (pos) {
			this.ori_pos = pos;
		}

       var x_dif = it.x-parent.x
       var y_dif = it.y-parent.y;
       this.drag_source=parent;
       this.initial_drag_angle= Math.atan2(y_dif,x_dif);
       this.drag_radius = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));               
};

D3MSTree.prototype._dragging= function(it, pos){
        if (! this.fixed_mode){
              return;
       }
       if (!this.drag_link){
              it.x=this.drag_orig_xy[0];
              it.y =this.drag_orig_xy[1];
              it.px=it.x;
              it.py=it.y;
              return;
       }
       if (pos) {
       		dx = pos[0] - this.ori_pos[0];
       		dy = pos[1] - this.ori_pos[1];
       } else {
       		dx =d3.event.dx, dy = d3.event.dy;
       }
       it.px += dx;
       it.py += dy;
       it.x += dx;
       it.y += dy;
       var source  =this.drag_source;
       var target =it;
       var x_dif = target.x-source.x;
       var y_dif = target.y - source.y;
       var actual_length = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));
       var required_length =  this.drag_link.link_distance;	
       var factor = required_length/actual_length;
       old_x=target.x;
       old_y=target.y;

       target.x = source.x+(x_dif*factor);
       target.y = source.y+(y_dif*factor);

       target.px= target.x;
       target.py =target.y;
       
       var final_angle = Math.atan2(it.y-source.y,it.x-source.x);
       var angle_change = final_angle- this.initial_drag_angle; 
       this._rotateChildren(it,angle_change,this.drag_source);			
       this.initial_drag_angle= Math.atan2(y_dif,x_dif);
       this._updateGraph();
};

D3MSTree.prototype._dragEnded=function(it){
       var self = this;

       if (! this.fixed_mode){
              return;
       }
       if (!this.drag_link){	       
              return;
       }
       var source  = this.drag_source;
       
       var target = it;
       var x_dif = target.x-source.x;
       var y_dif = target.y - source.y;
       var actual_length = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));
       
       var required_length =  this.drag_radius	
       var factor = required_length/actual_length;
       target.x = source.x+(x_dif*factor);
       target.y = source.y+(y_dif*factor);
       target.px= target.x;
       target.py =target.y;
       var final_angle = Math.atan2(it.y-source.y,it.x-source.x);
       var angle_change = final_angle- this.initial_drag_angle;
       this.node_elements.filter(function(node){
               return node.tagged;
       }).selectAll(".node-paths").style("stroke","black").attr("stroke-width","1px");
       this.link_elements.selectAll('line').filter(function(lnk){
               return lnk.tracked;
       }).style("stroke","black");
       it.fixed=true;
       it.tagged=false;
       this._rotateChildren(it,angle_change,source);
       this._updateGraph();
       this._tagAllChildren(it,false);
       this._tagParent(it, false);
       this.stopForce();
       this.dragging = false;
}

D3MSTree.prototype.createLinksFromNewick=function(node,parent_id){
       
       var node_id = this.original_nodes.length;
        if (node_id !=0){
                this.original_links.push({source:parent_id,target:node_id,distance:node.length});
        }
        if (node.children){
        		node.id = "_hypo_"+ (node_id);
                this.original_nodes.push(node.id);
                for (var index in node.children){
                        var child = node.children[index];
                        this.createLinksFromNewick(child,node_id);
                }
        } else {
                var name = node.name;
                if (this.taxon_key){
                        name = this.taxon_key[node.name];
                        if (!name){
                                name = node.name;
                        }
                        
                }
                this.original_nodes.push(name);
                node.id = name;
        }

}


/** Adds a listener to the node, which is called when the node is clicked
* @param {function} func A callback which is called when a node is clicked
* The functions is supplied the actual node and a list of IDs associated 
* with the node e.g. addNodeClickedListener(function(node,ids){...});
*/
D3MSTree.prototype.addNodeClickedListener=function(func){
        this.node_clicked_listeners.push(func);
}
/** Adds a listener to the node segment, which is called when the mouse is over the segment
* @param {function} func A callback which is called when a  segment is mouse overed
* The functions is supplied the segment e.g. addLinkOverListener(function(segment){...});
*/
D3MSTree.prototype.addSegmentOverListener=function(func){
        this.segment_over_listeners.push(func);
}
/** Adds a listener to the node segment, which is called when the mouse leaves the segment
* @param {function} func A callback which is called when the mouse leaves the segment
* The functions is supplied the segment e.g. addLinkOverListener(function(segment){...});
*/
D3MSTree.prototype.addSegmentOutListener=function(func){
        this.segment_out_listeners.push(func);
}


/** Adds a listener to the link, which is called when the link is clicked
* @param {function} func A callback which is called when a link is clicked
* The functions is supplied the link e.g. addLinkClickedListener(function(link){...});
*/
D3MSTree.prototype.addLinkClickedListener=function(func){
        this.link_clicked_listeners.push(func);
}
/** Adds a listener to the node, which is called when the mouse is over the link
* @param {function} func A callback which is called when a link is mouse overed
* The functions is supplied the link e.g. addLinkOverListener(function(link){...});
*/
D3MSTree.prototype.addLinkOverListener=function(func){
        this.link_over_listeners.push(func);
}
/** Adds a listener to the node, which is called when the mouse leaves the link
* @param {function} func A callback which is called when the mouse leaves the link
* The functions is supplied the link e.g. addLinkOverListener(function(link){...});
*/
D3MSTree.prototype.addLinkOutListener=function(func){
        this.link_out_listeners.push(func);
}






//brush functions
D3MSTree.prototype.brushEnded=function(extent){
	var self = this;
	if ((extent[0][0]-extent[1][0])*(extent[0][0]-extent[1][0]) + (extent[0][1]-extent[1][1])*(extent[0][1]-extent[1][1]) < 4) {
		var selected_nodes = this.node_elements.filter(function(d){
			r = self.node_radii[d.id] ? self.node_radii[d.id] : 3;
			return ( (d.x - extent[0][0])*(d.x - extent[0][0]) + (d.y - extent[0][1])*(d.y - extent[0][1]) <= r*r);
		});
		if (selected_nodes[0].length > 0) {
			var last_node = selected_nodes[0][selected_nodes[0].length-1].id;
			selected_nodes = selected_nodes.filter(function(d) {
				return d.id == last_node;
			})
		}
	} else {
        var selected_nodes = this.node_elements.filter(function(d){return (extent[0][0] <= d.x && d.x < extent[1][0] && extent[0][1] <= d.y && d.y < extent[1][1])});
	}
        var not_in_selection = selected_nodes.filter(function(d) {return (! d.selected)});
        if (not_in_selection[0].length > 0) {
                not_in_selection.filter(function(d) {d.selected=true});
        } else {
                selected_nodes.filter(function(d) {delete d.selected; delete node.halo_colour; delete node.halo_thickness});
                this.clearSelection(true);
        }
     
       this._updateSelectionStatus();
}

D3MSTree.prototype.selectAll=function(){
	this.force_nodes.forEach(function(n) {n.selected=true;});
	this._updateSelectionStatus();
}
D3MSTree.prototype._updateSelectionStatus = function() {
	this._addHalos(function(d){return d.selected},5,"red"); 
	for (var i in this.nodesSelectedListeners){
		 this.nodesSelectedListeners[i](this);    
       }
}
