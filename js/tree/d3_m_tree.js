D3MSTree.prototype = Object.create(D3BaseTree.prototype);
D3MSTree.prototype.constructor = D3MSTree;

/**
* @typedef {Object} InitialData
* @property {list} -a load of nodes
*
*/

/**
* @constructor
* @extends D3BaseTree
* @param {string} element_id - The id of the container for the tree
* @param {InitialData} data -An  object containing the following 
*<ul>
*  <li>metadata- An object of metadata id  to key/value metadata e.g {23:{"strain":"bob","country":"Egypt",ID:"ST131"},....} </li>
* <li>nodes - A list of node names ['ST131','ST11'] if the node represents a hypothetical node then the name should be  'hypothetical_node' </li>
*  <li> links  - A list of source / target / values , where source and targets are indexes to the nodes list e.g. [{source:0,target:1,value:10},...]</li>
* <li> layoutdata - An object containing the layoudata
* </ul>
* @param {function} callback The function to be called when the set up is finished (optional)
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
        this.show_node_labels=true;
        this.node_font_size=14;
        this.link_font_size=10;
        this.log_link_scale=false;
        this.fixed_mode=true;
        this.node_radii={};
        this.previous_node_radii={};
        this.node_clicked_listeners=[];
        //Any link with a value above this will have be as long as _max_link_scale
        this.max_link_length=10000;
        //the length in pixels of the longest link
        this.max_link_scale=500;
        this.hide_link_length=10000;
        if (data['hide_link_length']){
                this.hide_link_length  = data['hide_link_length'];
        }
        this.show_link_labels=false;
        
        this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]);

        this.show_individual_segments=false;
        //node sizes and log scale
        this.size_power=0.41;
        this.base_node_size=10;
        this.update_graphics=true;
      
        
        this.precompute=true;
        
        
        this.pie = d3.layout.pie().sort(null).value(function(it){
                return it.value;
        });
      
        if (data['initial_category']){
                this.display_category=data['initial_category'];
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
              self._dragStarted(it);
        })         
        .on('drag', function(it){
              self._dragging(it)
        })
        .on('dragend',function(it){
              self._dragEnded(it)
        });
       
        this.add_collapsed_lengths=true;
        this.node_collapsed_value=0;
        
        this.original_nodes =[]   
        this.original_links =[];
        this.force_nodes = this.d3_force_directed_graph.nodes();
        this.force_links = this.d3_force_directed_graph.links();
        var positions = null;
       
        if (data['nexus'] || data['nwk']){
                var root = null;
                if(data['nexus']){
                        var obj = this.readNexusFile(data['nexus']);
                        this.taxon_key = obj.translate;
                        root =obj.root; 
                }
                else{
                        root = this.parseNewick(data['nwk']);   
                }
                
                this.createLinksFromNewick(root);
                if (data['layout_algorithm']!=='force'){
                        var nodes = _traverse(root);
                        data['layout_data']= {'node_positions':this.greedy_layout(nodes)};
                }

              
        } else {
                this.original_nodes=data['nodes'];
                this.original_links=data['links'];
        }
        for (var i in this.original_nodes){
                var name = this.original_nodes[i];
                this.grouped_nodes[name]=[name];
        }
        var positions = null;
        if (data['layout_data']){
                positions = data['layout_data']['node_positions']
        
        }
        
        if (data['layout_data'] && positions){
                this.original_node_positions=positions;
                if (data['layout_data']['nodes_links']){
                           var to_collapse = this.node_collapsed_value=data['layout_data']['nodes_links']['node_collapsed_value'];
                } else {
                        var to_collapse =(data['layout_algorithm']==='force')?0: 1e-8;
                        this.node_collapsed_value=0;
                }
        } 
      
        if (callback){
                callback(this,"Collapsing Nodes:"+this.original_nodes.length);
        
        }
        if (data['layout_algorithm']=='force'){
                to_collapse=0;
        }
     
        this._collapseNodes(to_collapse, positions);
        if (callback){
                callback(this,"Nodes"+this.force_nodes.length);
        }
                                   
        this.root_node=null;
        for (var index in this.force_nodes){
                var node = this.force_nodes[index];
                if (!node.parent){
                        this.root_node=node;
                        break;
                }
        
        }
        //collapsing may have altered the the layout
        if ((data['nexus'] || data['nwk']) && data['layout_algorithm']!=='force'){
                var new_node_positions=this.greedy_layout(this.force_nodes, this.max_link_scale, this.base_node_size);
                for (var id in new_node_positions){
                        data['layout_data']['node_positions'][id]=new_node_positions[id];
                }
        
        }
        
        //this._updateNodeRadii();
        this._start(callback,data['layout_data'],positions);
};

D3MSTree.prototype.greedy_layout = function(nodes, link_scale=500, node_size=10) {
        // determine minimum params
        for (var id in nodes) {
                node = nodes[id];
                if (! node.size) {
                        node.size = (node.children && node.children.length > 0 ? 1 : 0.1);
                }
        }
        var max_radial = 0.0, min_angle = 0.0;
        for (var id in nodes) {
                node = nodes[id];
                if (node.length > max_radial) {
                        max_radial = node.length;
                }
                min_angle += node.size;
        }
        var node_scale = Math.sqrt(node_size);
        var min_radial = 2*max_radial*node_scale/link_scale, min_angle = Math.PI / min_angle, ite = 0;
        while (1) {
                // get radius of descendents
                for (var id = nodes.length-1; id >= 0; id --) {
                        node = nodes[id];
                        var span1 = [min_radial*Math.sqrt(node.size), min_angle*Math.sqrt(node.size)];
                        if (! node.children || node.children.length == 0) {
                                node.des_span = span1;
                        } else {
                                var radial_sum = 0, angle_sum = 0; 
                                for (var jd in node.children) {
                                        child = node.children[jd];
                                        if (! child.des_span) 
                                                continue;
                                        self_radial = min_radial * Math.sqrt(node.size);
                                        if (Math.cos(Math.PI - child.des_span[1]) > child.des_span[0] / (child.length+self_radial) ) {
                                                if (child.des_span[0] < child.length+self_radial) {
                                                        var span = [child.length+self_radial, Math.asin(child.des_span[0] / (child.length+self_radial))];
                                                }
                                        } else {
                                                var span = to_Polar(to_Cartesian(child.des_span), [-(child.length + self_radial), 0]);
                                                span[0] = Math.max(span[0], child.length+self_radial, child.des_span[0]);
                                        }
                                        child.self_span = [span[0], span[1]];
                                        angle_sum += span[1] + min_angle;
                                        //radial_sum += span[0] * (span[1]+min_angle);
                                        if (span[0] > radial_sum) radial_sum = span[0];
                                }
                                var span2 = [radial_sum, angle_sum];
                                node.des_span = [Math.max(span1[0], span2[0]), Math.max(span1[1], span2[1])];
                                if (node.des_span[1] > Math.PI) {
                                        node.des_span[1] = Math.PI;
                                }
                        }
                }
                
                // get radius of ancestral
                var max_span = nodes[0].des_span[1];
                nodes[0].anc_span = [0, 0];
                for (var id=1; id < nodes.length; ++id) {
                        node = nodes[id];
                        self_radial = min_radial * Math.sqrt(node.size);

                        var radial_sum = node.parent.anc_span[0], angle_sum = node.parent.anc_span[1];
                        for (var jd=0; jd < node.parent.children.length; jd ++) {
                                sister = node.parent.children[jd];
                                if (sister.id != node.id) {
                                        if (sister.self_span[0] > radial_sum) {
                                                radial_sum = sister.self_span[0];
                                                angle_sum += sister.self_span[1];
                                        }
                                }
                        }
                        var span = [radial_sum, angle_sum];
                        if (Math.cos(Math.PI - span[1]) > span[0] / (node.length + self_radial)) {
                                if (span[0] < node.length+self_radial) {
                                        var anc_span = [node.length+self_radial, Math.sin(span[0]/node.length+self_radial)];
                                } else {
                                        var anc_span = to_Polar(to_Cartesian(span), [-(node.length + self_radial), 0]);
                                        anc_span[0] = span[0];
                                }
                        } else {
                                var anc_span = to_Polar(to_Cartesian(span), [-(node.length + self_radial), 0]);
                                if (anc_span[0] < node.length+self_radial) {
                                        anc_span[0] = node.length+self_radial;
                                }
                        }
                        node.anc_span = [anc_span[0], anc_span[1]];
                        if (node.anc_span[1] + node.des_span[1] > max_span) {
                                max_span = node.anc_span[1] + node.des_span[1];
                        }
                }
                ite ++;
                if ((Math.PI >= max_span && (Math.PI < 1.05 * max_span || ite > 20)) || ite > 50) {
                        break;
                }
                min_angle = (Math.PI / max_span) * min_angle;
        }
        /// dynamic update local nodes
        // convert to cartesian
        nodes[0].polar = [0, 0];
        nodes[0].coordinates = [0, 0];
        coordinates = {};
        coordinates[nodes[0].id] = nodes[0].coordinates;
        for (var id=0; id < nodes.length; ++id) {
                node = nodes[id];
                self_radial = min_radial * Math.sqrt(node.size);
                coordinates[node.id] = node.coordinates;
                if (id > 0) {
                        var initial_angle = -node.des_span[1];
                        if (node.children) {
                                for (var jd=0; jd < node.children.length; ++ jd) {
                                        child = node.children[jd];
                                        child.polar = [child.length + self_radial, initial_angle + child.self_span[1] + min_angle + node.polar[1]];
                                        initial_angle += (child.self_span[1] + min_angle)*2;
                                        child.coordinates = to_Cartesian(child.polar);
                                        child.coordinates[0] += node.coordinates[0], child.coordinates[1] += node.coordinates[1];
                                }
                        }
                } else {
                        var gap = Math.max(0, (Math.PI - node.des_span[1]) / node.children.length);
                        var initial_angle = 0;
                        for (var jd=0; jd < node.children.length; ++ jd) {
                                child = node.children[jd];
                                child.polar = [child.length + self_radial, initial_angle + child.self_span[1] + min_angle + node.polar[1]];
                                initial_angle += (child.self_span[1] + min_angle + gap)*2;
                                child.coordinates = to_Cartesian(child.polar);
                                child.coordinates[0] += node.coordinates[0], child.coordinates[1] += node.coordinates[1];
                        }
                }
        }
        return coordinates;
}

_traverse = function(tree) {
        nodes = [tree];
        for (id in tree['children']) {
            tree['children'][id]['parent'] = tree;
            nodes = nodes.concat(_traverse(tree['children'][id]));
        }
        return nodes;
}
to_Cartesian = function(coord, center=[0, 0]) {
    var r = coord[0], theta = coord[1];
    return [r*Math.cos(theta) + center[0], r*Math.sin(theta) + center[1]];
}
to_Polar = function(coord, center=[0, 0]) {
    var x = coord[0] - center[0], y = coord[1] - center[1];
    return [Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)), Math.atan2(y, x)];
}


D3MSTree.prototype.getRadialCoordinates= function(angle,radius){
          var c0 = Math.cos(angle = (angle- 90) / 180 * Math.PI),
                        s0 = Math.sin(angle);
                return [radius*c0,radius*s0];
};

D3MSTree.prototype.calculateX =function(len,node){
        var length = len;
       
        if (node.length){
              length=len+node.length;
        }
        node.y=length;
        
      
        var children = node.children;
        if (children){
                for (var i in children){
                       
                        this.calculateX(length,children[i]);
                }                  
        }                
};


D3MSTree.prototype._start= function(callback,layout_data,positions){
       var self = this;
       //add the links
       this.canvas.selectAll('g.link').remove();
       this.link_elements = this.canvas.selectAll('g.link').data(this.force_links, function(it){
                return it.source.id + "-" + it.target.id;
        });
        var link_enter = this.link_elements.enter().append('g').attr('id', function(it){
                return it.source.id + "-" + it.target.id;
        }).attr('class', "link mst-element");
        
        link_enter.append('line').on("click",function(d){
                self.linkClicked();
        }).on("mouseover",function(d){
                self.linkMouseOver(d);
        
        }).on("mouseout",function(d){
                self.linkMouseOut(d);
        });
        
         
      
        
        //this.canvas.selectAll('.node').remove();
        this.node_elements = this.canvas.selectAll('.node').data(this.force_nodes, function(it){
                return it.id;
        });
        
        //nodes
        this.node_elements.exit().remove();
        var new_node_elements = this.node_elements.enter().append('g').attr('class', "node mst-element").attr('id', function(it){
                return it.id;
        });
     
        new_node_elements.append('text').attr('class', 'link-label').attr('text-anchor', 'middle').attr('font-size', '14px').attr('font-family', 'sans-serif').style('fill', 'gray').style('stroke', 'black').style('stroke-width', '.25px').style('opacity', 1).text(function(it){
                return it.id;
        });
      
        new_node_elements.call(this.force_drag).
        on('dblclick', function(it){
            
        }).on('mouseup', function(it){
                if (!self.is_dragging){
                        var ids = self._getIDsForNode(it.id);
                        for (var i in self.node_clicked_listeners){
                                self.node_clicked_listeners[i](it,ids)
                        }
                }
                self.is_dragging=false;
        });
        
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
        //this.rendering_time= this.force_nodes.length/10;
       // if (this.rendering_time<15){
                this.rendering_time=15;
        //}
        if (!layout_data){ 
                this.charge=-400;
                this._setLinkDistance();
                this.gravity=0;
                this.svg.style("display","none");
                this.startForce();
                //for some reason need to give random positions, otherwise leads to stack 
                for (var i in this.force_nodes){
                        var node=this.force_nodes[i];
                        if (positions){
                                var pos = positions[node.id];
                                node.x=pos[0];
                                node.y=pos[1];
                        
                        }
                        else{
                                node.x=Math.random()*1000;
                                node.y=Math.random()*1000;
                        }
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
                this.changeCategory(this.display_category);
                this._updateGraph(true);
                this.startForce();
                this.stopForce();
                if (callback){
                        callback(this,"complete");
                }
        }
}

D3MSTree.prototype.collapseNodes= function(max_distance,increase_lengths){
        layout = JSON.parse(JSON.stringify(this.original_node_positions));
        this._collapseNodes(max_distance, layout);
        this._start(null,{"node_positions":layout,"scale":this.scale,"translate":this.translate});
        //this.unfixSelectedNodes(true);        
        //this.refreshGraph();
       

}

D3MSTree.prototype._collapseNodes=function(max_distance,layout){
        //store the pooition of the original nodes
        if (this.node_collapsed_value===0){   
                for (var i in this.force_nodes){
                        var node = this.force_nodes[i];
                        if (layout){
                                layout[node.id] = this.original_node_positions[node.id]=[node.x,node.y];
                        }
                }
                // layout = JSON.parse(JSON.stringify(this.original_node_positions));

        }

        if (max_distance<=this.node_collapsed_value || (! this.force_nodes) || this.force_nodes.length == 0){
                this._addNodes(this.original_nodes);
                this._addLinks(this.original_links,this.original_nodes);
                this.grouped_nodes={};
                for (var i in this.original_nodes){
                        var name = this.original_nodes[i];
                        this.grouped_nodes[name]= [name];
                }
        }
        var node2link = {}, anc_link = {};

        for (index in this.force_links){
                var link = this.force_links[index];
                if (! node2link[link.source.id]) {
                        node2link[link.source.id] = [link];
                } else {
                        node2link[link.source.id].push(link);
                }
                if (! link.target.children) {
                        node2link[link.target.id] = [];
                }
                anc_link[link.target.id] = link;
             
        }

        this.force_links.sort(function (link1,link2){
                return link1.value - link2.value;
        });
        

        for (var index in this.force_links){
                var l = this.force_links[index];

                if (l.value<=max_distance){
                        l.remove=l.target.remove=true;

                        if (!l.source.hypothetical && !l.target.hypothetical){
                                this.grouped_nodes[l.source.id]=this.grouped_nodes[l.source.id].concat(this.grouped_nodes[l.target.id]);
                        }
                        var increase=l.value;

                        for (var i in l.source.children){
                                if (l.source.children[i].id===l.target.id){
                                        l.source.children.splice(i,1);
                                        break;
                                }
                        }

                        for (var i in l.target.children){
                                var child = l.target.children[i];
                                l.source.children.push(child);
                                child.parent = l.source;
                        }
                        
                        var child_links = node2link[l.target.id];
                        for (var i in child_links){
                                 var ln = child_links[i];
                                 if (! ln.remove) {
                                         ln.source=l.source;
                                         if (l.target.hypothetical) ln.value += increase;
                                         node2link[l.source.id].push(ln);
                                 }
                        }

                        if (l.source.hypothetical && !l.target.hypothetical){
                                delete l.source.hypothetical;
                                if (node2link[l.source.id]) {
                                       to_add = {};
                                       for (var id in node2link[l.source.id]) {
                                               ln = node2link[l.source.id][id];
                                               if (! ln.remove ) to_add[ln.target.id] = 1;
                                       }
                                       for (id in to_add) 
                                               anc_link[id].value += increase;
                                       
                                       node2link[l.target.id] = (node2link[l.target.id] ? node2link[l.target.id].concat(node2link[l.source.id]) : node2link[l.source.id]);
                                }
                                if (anc_link[l.source.id]) anc_link[l.source.id].value += increase;
                                anc_link[l.target.id] = anc_link[l.source.id];
                                if (max_distance > this.node_collapsed_value && layout) layout[l.target.id] = layout[l.source.id];
                                l.source.id =l.target.id;
                            
                        }
                }            
        }
        this.node_collapsed_value=max_distance;

        var temp_force_nodes=this.force_nodes.filter(function( obj ) {
                return ! obj.remove;
        });

        var temp_force_links= this.force_links.filter(function( obj ) {
                return ! obj.remove;
        });
      
        this.force_links.length=0;
        for (var i in temp_force_links){
                this.force_links.push(temp_force_links[i]);
               
        }
   
        this.force_nodes.length=0;
        for (var i in temp_force_nodes){
                var t_node = temp_force_nodes[i];
                this.force_nodes.push(t_node);
        }
     
        for (var id in this.force_nodes) {
                node = this.force_nodes[id];
                node.size = ((this.grouped_nodes[node.id]) ? this.grouped_nodes[node.id].length : 0.1);
                if (anc_link[node.id]) 
                        node.length = anc_link[node.id].value;
        }
        this._updateNodeRadii();
        
};



D3MSTree.prototype._getLinksWithSource =function(node2link, source_id, exclude_target_id){
        var links = [];
        if (exclude_target_id) {
                for (index in node2link[source_id]) {
                        var link = node2link[source_id][index];
                        if (! link['remove'] && link.source.id != exclude_target_id && link.target.id != exclude_target_id) {
                                links.push(link)
                        }
                }
        }
        return links;
}

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
                        .linkStrength(10)
                        .size([this.width, this.height])
                        .start();
};

D3MSTree.prototype.stopForce = function(){
        this.d3_force_directed_graph.stop();
};
        



/**
* Updates the tree with the supplied data. Any paramater not supplied will be default
* @param {object} layout _data - An  object containing the following:
* node_positions: a dictionary of node id to an array of x,y co-ordinate e.g.
* {ST234:[23,76],ST455:[65,75]}
* node_links: a dictionary of the following
* max_link_scale : The length in pixels of the longest link
* size_power: The size of nodes representing multiple datapoints are calculated by number of points to the power of this value
* base_node_size: The radius in pixels of a nodes 
* max_link_length: Any links with a value over this will be trimmed to this length 
* scale: The scale factor (1.0 being normal size)
* translate: The offset of the tree an array of x.y co-ordinate e.g. [30.-20]
*/
D3MSTree.prototype.setLayout = function(layout_data){
        if  (layout_data['node_positions']){
                for (var i in this.force_nodes){
                        var node = this.force_nodes[i];
                        var pos = layout_data['node_positions'][node.id];
                        node.x=pos[0];
                        node.px=pos[0];
                        node.y=pos[1];
                        node.py=pos[1];
                      
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
                this.node_font_size = data['node_font_size']?data['node_font_size']:this.node_font_size
                this.show_individual_segments=data['show_individual_segments'];
                if (data['show_node_labels']===undefined){
                       this.show_node_labels=true; 
                }
                else{
                        this.show_node_labels= data['show_node_labels'];
                }
                this.hide_link_length= data["hide_link_length"]?data["hide_link_length"]:this.hide_link_length
                this.custom_colours = data['custom_colours']?data['custom_colours']:this.custom_colours;
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
* @returns {object} layout _data - @see D3MSTree#setLayout
*/
D3MSTree.prototype.getLayout=function(){   
        var node_positions={};
        for (var i in this.force_nodes){
                var node = this.force_nodes[i];            
                node_positions[node.id]=[node.x,node.y];
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
                node_collapsed_value:this.node_collapsed_value
                
        };
        if (this.log_link_scale){
                nodes_links['log_link_scale']= "true";
        }
        return {node_positions:node_positions,
                        nodes_links:nodes_links,
                        scale:this.scale,
                        translate:this.translate,                      
        };	
};

D3MSTree.prototype._drawLinks=function(){
        var self=this;
        this.link_elements.selectAll("line").style('stroke', function(it){
                if (it.value >= self.hide_link_length){
                        return "white";
                }
                else if (it.value > self.max_link_length){
                        return "black";
                }
                return "black";
        }).attr('stroke-dasharray', function(it){
                if (self.max_link_length && it.value > self.max_link_length){
                        return "3,5";
                }
                        return "";
        })
        .attr("stroke-width","3px");
        
        this.link_elements.selectAll(".distance-label").attr("font-size",this.link_font_size);
                       
}


//
D3MSTree.prototype.changeCategory= function(category){
        if (! category){
                this.display_category=null;
                this.category_colours['missing']=this.default_colour;
        
        }
        else{
                this._changeCategory(category);
        }
        
        
        var self = this;
        var hypo_nodes = this.node_elements.filter(function(d){return d.hypothetical}).
                selectAll("circle").data(function(parent){
                        return [{cx:parent.x,cy:parent.y}];
                });
    
        hypo_nodes.enter().append("circle").attr("r",3).style("fill","gray");
        
        
        var nodes_existing = this.node_elements.filter(function(d){return !d.hypothetical})
                                                .selectAll('.node-paths').data(function(it){
                                                        return self._getPieData(it, category);
                                                        
                                                });
        nodes_existing.enter().append('path').classed("node-paths",true);
        nodes_existing.exit().remove();
        
       this.node_elements.selectAll('.node-paths')
        .on("mouseover",function(d){
                self.segmentMouseOver(d);
        }).on("mouseout",function(d){
                self.segmentMouseOut(d);
        })
        .style("stroke","black");      
        this._drawNodes();
        this._setNodeText();
}


D3MSTree.prototype._drawNodes=function(){
        var self = this;
        this.node_elements.selectAll('.node-paths').attr('d', this.arc).attr('fill', function(it){
                if (it.data.node_id){
                        return self.default_colour;
                }
                 return self.category_colours[it.data.type];
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

D3MSTree.prototype.setNodeText = function(value){
    
        this.node_text_value=value;
        this._setNodeText();
}


D3MSTree.prototype.getTreeAsObject=function(){
        var obj = {
                links:this.original_links,
                nodes:this.original_nodes,
                layout_data:this.getLayout(),
                metadata:this.metadata,
                initial_category:this.display_category
        }
        return obj;

}

D3MSTree.prototype._setNodeText = function(){
        var self=this;
        var field =this.node_text_value;
        this.node_elements.selectAll('text').remove();
        if (! this.show_node_labels){
                return;
        }
        node_text = this.node_elements.filter(function(d){
                return !d.hypothetical;
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





D3MSTree.prototype._calculateArc=function(){
        var self=this;
        return d3.svg.arc().outerRadius(function(it){
               return self.node_radii[it.data.idx];
        }).innerRadius(0);

}


D3MSTree.prototype._getPieData = function(d, category){
        var results =[];
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
                                value:1,
                                type:'missing',
                                idx:d.id               
                        }];
                }
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

D3MSTree.prototype._updateNodeRadii=function(){
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
                }
                this.node_radii[node.id]=radius;
        }
    
}

D3MSTree.prototype._saveNodeRadii=function(){
        for (var i in this.force_nodes){
                node = this.force_nodes[i];
                var radius=0;
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
                
                }
                
                this.previous_node_radii[node.id]=radius;
        }
}

D3MSTree.prototype._addNodes=function(ids){
        this.force_nodes.length=0;
        if (ids.length < 4){
                this.gravity=0.02;
        }
        
        for ( var i = 0;i < ids.length; i++) {
                id = ids[i];
                var name =id;
                if (id === "hypothetical_node"){
                        name = "_hypo_node_"+i;
                        ids[i]=name;
                }
                var node = {
                      id:name,
                      value:-1,
                      selected:false
                };
                 if (id === "hypothetical_node" || id.startsWith("_hypo_node_")){
                        node['hypothetical']=true;
                 }
                
                this.force_nodes.push(node);    
        }
}

D3MSTree.prototype._findNode=function(id){
       for (var i in this.force_nodes){
              n=this.force_nodes[i];
              if (n.id === id){
                     return n
              }     
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
        this.force_links.length=0;
        var new_links=[];
       for (var i in links){
                link = links[i];
                new_links.push({
                       value:link['distance'],
                       source:ids[link['source']],
                       target:ids[link['target']]      
                });
       }
       this.max_link_distance=0;
       this.min_link_distance =10000;
       for (var i=0;i< new_links.length;i++) {
                x = new_links[i];
                if (x.value > this.max_link_distance){
                       this.max_link_distance=x.value;
                }
                if (x.value<this.min_link_distance & x.value !==0){
                        this.min_link_distance=x.value;
                }
                var target_node = this._findNode(x.target);
                var source_node = this._findNode(x.source);
                var link = {
                       source: source_node,
                       target: target_node,
                       value: x.value
                };
                this.force_links.push(link)
        }
          
        this.distance_scale= d3.scale.linear().domain([0,this.max_link_distance]).range([0,this.max_link_scale]);
        //add the children/parents
        for (var i in this.force_links){
                var link = this.force_links[i];
                
                if (!link.source['children']){
                        link.source['children']=[]
                }
                link.source.children.push(link.target);
                link.target.parent = link.source;            
        }      
}

D3MSTree.prototype._getLink=function(target_node){
        for (var index in this.force_links){
                if (this.force_links[index].target.id === target_node.id){
                        return this.force_links[index];
                }		
        }	
}

/** Internally sets the actual length of the link to be acurate to the supplied value
* If not in fixed mode than this may not be strictly adhered
*/
 D3MSTree.prototype._setLinkDistance=function(){
        var self= this;
        this.link_elements.each(function(d){			
                var length =  self.node_radii[d.source.id] + self.node_radii[d.target.id];
                var line_len = d.value;
                if (self.max_link_length){
                        if (line_len>self.max_link_length){
                                line_len=self.max_link_length;
                        }
                }
                if (self.log_link_scale){
                        length=Math.pow(self.distance_scale(line_len),0.8)+length;
                }
                else{
                        length =  self.distance_scale(line_len)+length;
                }
                d.link_distance=length;		
        });
 };
 
 D3MSTree.prototype.refreshGraph = function(callback){
        layout = this.greedy_layout(this.force_nodes, this.max_link_scale, this.base_node_size);
        this._updateNodeRadii();
        this._start(callback,{"node_positions":layout,"scale":this.scale,"translate":this.translate});
}

D3MSTree.prototype._centerGraph = function(){
        var firstNode = this.force_nodes[0];                      
        var maxX=firstNode.x;
        var minX=firstNode.x;
        var maxY = firstNode.y;
        var minY = firstNode.y;
        var nodes = this.force_nodes;
        for (var n=1;n<nodes.length;n++){
                var node = nodes[n];
                if (node.x>maxX){maxX=node.x;}
                if (node.x<minX){minX=node.x;}
                if (node.y>maxY){maxY=node.y;}
                if (node.y<minY){minY=node.y;}
                                
        }   
        for (var n=0;n<nodes.length;n++){
                var node = nodes[n];
                node.x-=minX;
                node.px =node.x;
                node.y -=minY;
                node.py=node.y
                                
        }
        var wdiff = maxX-minX;
        var hdiff = maxY-minY;
        var scale=1;
       if (wdiff>hdiff){
                scale = (this.width/(maxX-minX));
       }
        else{
               scale = (this.height/(maxY-minY));
        }
        this.setScale(scale);
        this.setTranslate([0,0]);
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
        this._updateGraph(true);      
}

D3MSTree.prototype.clearSelection= function(){ 
        for (var i in this.force_nodes) {
                var node = this.force_nodes[i];
                node.selected = false;
                delete node.halo_colour;
                delete node.halo_thickness
        }
        this.node_elements.classed('selected', false);
        this.node_elements.selectAll(".halo").remove();
        
};


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

/** Sets the length of the links
* @param {integer} max_length - This  specifies the maximum length of the links in pixels
* The longest link will be this length and the rest scaled between this value and 1
* If in fixed mode, node lengths will be exact, otherwise the force algorithm may not be able to acheieve the 
* correct length
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
resets the link lenghts to accurately reflect the supplied value
*/
D3MSTree.prototype.resetLinkLengths=function(){
        this._setLinkDistance();
        this.stopForce();        
                for (var ii in this.force_links){
                        this._correctLinkLengths(this.force_links[ii]);                              
                }
                this._updateGraph(true);
       // this.startForce();
        
};

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
                                        style('fill', 'gray').style('stroke', 'black').style('stroke-width', '.25px').
                                        text(function(it){
                                                 return it.value.toPrecision(2);
                                        });
                                        
        this.link_elements.selectAll('text').attr('x', function(it){
                
                return (it.source.x + it.target.x) / 2.0;
                
        }).attr('y', function(it){
                return (it.source.y + it.target.y) / 2.0;
        });
     
}



D3MSTree.prototype.setNodeSize = function(node_size){
        this._saveNodeRadii();
        this.base_node_size=node_size;	 
        this._updateNodeRadii();
        this._nodeSizeAltered();
       
};

D3MSTree.prototype.setRelativeNodeSize = function(factor){
        this._saveNodeRadii();
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




D3MSTree.prototype.showIndividualSegments= function(show){
        this.show_individual_segments=show;
        this.changeCategory(this.display_category);
        this._drawNodes();

};

D3MSTree.prototype.setNodeFontSize = function(size){
        this.node_font_size=size;
        this._setNodeText();
};


D3MSTree.prototype.setNodeText = function(value){
        this.node_text_value = value;
        this._setNodeText();
};

D3MSTree.prototype.showNodeLabels = function(show){
        this.show_node_labels= show;
        this._setNodeText();
};

D3MSTree.prototype.alterCharge=function(amount){
        this.charge = amount*-1;
        this.startForce();
};


D3MSTree.prototype._correctLinkLengths= function(it){
        //this.stop_force();
         
        var source  =it.source;
        var target =it.target;
        var x_dif = target.x-source.x;
        var y_dif = target.y - source.y;
        var actual_length = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));
        var required_length =  it.link_distance;
        var factor = required_length/actual_length;
        old_x=target.x;
        old_y=target.y;	
        target.x = source.x+(x_dif*factor);
        target.y = source.y+(y_dif*factor);	
        target.px= target.x;
        target.py =target.y
        this._alterChildrenPosition(target,target.x-old_x,target.y-old_y);
        
}


D3MSTree.prototype._addHalos= function (filter_function,thickness,colour){
        var self = this;
        var arc1 = d3.svg.arc().innerRadius(30).outerRadius(40).startAngle(0).endAngle(2 * Math.PI);
        var ret1 = arc1();
        
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
                if (a.halo_thickness){
                        return 1;
                }
                else{
                        if (b.halo_thickness){
                                return -1;
                        }
                        else{
                                return 0;
                        }
                }
         
         })
  
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

D3MSTree.prototype.fixAllNodes=function(){
        this.stopForce();
        for (var index in this.force_nodes){
                var node = this.force_nodes[index];   
                        node.fixed=true;
                        node.update=false;			
        }
        for (var ii in this.force_links){
                var link = this.force_links[ii];
                link.link_distance= this._getActualLinkLength(link);
                                
        }
        this.fixed_mode=true;
        this._updateGraph(true);	
        //this.change_nodes_to_update();
        //this.startForce();
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

    
                if (!node.children){
                        return;
                }
                for (var x in node.children){
                        child = node.children[x];
                        
                        child.x+=x_diff;
                        child.y+=y_diff;
                        child.px=child.x;
                        child.py=child.y
                        this._alterChildrenPosition(child,x_diff,y_diff);
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

D3MSTree.prototype.highlightIDs = function (IDs){
       this.clearSelection();
       var self = this;
       this._addHalos(function(d){
                        var group = self.getIDsForNode(d.id)
                        for (var i=0;i<IDs.length;i++){
                                if (group.indexOf(IDs[i]) !== -1){
                                        return true;
                                }
                        }
                        return false;

        },22,"yellow");
      
}


//Dragging Functions
D3MSTree.prototype._dragStarted= function(it){
       if (! this.fixed_mode){
              return;
       }
      
       this.stopForce();
       if (!it.parent){
              this.drag_orig_xy=[it.x,it.y];
              return;
       }
                
       it.fixed=true;
       it.tagged=true;
       //tag all children and highlight        
       this._tagAllChildren(it,true);         
       this.node_elements.filter(function(node){
              return node.tagged;
       }).selectAll(".node-paths").style("stroke","red").attr("stroke-width","3px");
       this._updateNodesToDisplay("tagged");
       
       this.drag_link =this._getLink(it);
       var x_dif = it.x-it.parent.x
       var y_dif = it.y-it.parent.y;
       this.drag_source=it.parent;
       this.initial_drag_angle= Math.atan2(y_dif,x_dif);
       this.drag_radius = Math.sqrt((x_dif*x_dif)+(y_dif*y_dif));               
};

D3MSTree.prototype._dragging= function(it){
        this.is_dragging=true;
        if (! this.fixed_mode){
              return;
       }
       if (!it.parent){
              it.x=this.drag_orig_xy[0];
              it.y =this.drag_orig_xy[1];
              it.px=it.x;
              it.py=it.y;
              return;
       }
       it.px += d3.event.dx;
       it.py += d3.event.dy;
       it.x += d3.event.dx;
       it.y += d3.event.dy;
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
       if (!it.parent){	       
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
       it.fixed=true;
       it.tagged=false;
       this._rotateChildren(it,angle_change,source);
       this._updateGraph();
       this._tagAllChildren(it,false);
       this.stopForce();
}

D3MSTree.prototype.createLinksFromNewick=function(node,parent_id){
       
        if (node.children){
                 this.original_nodes.push("_hypo_node_"+ this.original_nodes.length);
                 node.id = "_hypo_node_"+ (this.original_nodes.length-1);
        }
        else{
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
        var node_id = this.original_nodes.length-1;
        if (node_id !=0){
                this.original_links.push({source:parent_id,target:node_id,distance:node.length});
        }
        if (node.children){
                for (var index in node.children){
                        var child = node.children[index];
                        this.createLinksFromNewick(child,node_id);
                }
        }
}


D3MSTree.prototype.createLinksFromNewick2=function(nodes){
        for (var i in nodes){
                var node = nodes[i];
                if (node.children){
                        this.original_nodes.push("_hypo_node_"+i);
                        node.name = "_hypo_node_"+i;
                }
                else{
                         var name = node.name;
                         if (this.taxon_key){
                                name = this.taxon_key[node.name];
                                if (!name){
                                        name = node.name;
                                }
                        }
                        this.original_nodes.push(name+"");
                        
                
                }
                if (node.parent){
                        this.original_links.push({source:node.parent,target:node.id,distance:node.edge_length})
                
                }
          
        }
}

D3MSTree.prototype.addNodeClickedListener=function(func){
        this.node_clicked_listeners.push(func);
}

//brush functions
D3MSTree.prototype.brushEnded=function(extent){
        this.node_elements.filter(function(d){
                var selected =(extent[0][0] <= d.x && d.x < extent[1][0] && extent[0][1] <= d.y && d.y < extent[1][1]);
                if (selected){
                        d.selected=true;
                }
                return selected;
        }).classed("selected","true");
     
       this._addHalos(function(d){return d.selected},5,"red");
}