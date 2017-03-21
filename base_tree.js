
D3BaseTree.prototype = Object.create(null);
D3BaseTree.prototype.constructor=D3BaseTree;


/**
*  The base class for trees
* @constructor
* @param {string} element_id - The id of the container for the tree
* @param {object} metadata - (optional )An object with the following format
* <pre>
*	{object_id:{ID:"node_id",key:"value",....},......}
* </pre>
* @param {integer} height - the initial height. The container will be reisized to this height. If absent, the height of the container will be used
* @param {integer} width - the initial width. The container will be reisized to this width If absent, the width of the container will be used
*
*/
function D3BaseTree(element_id,metadata,height,width){
	var self=this;
	this.legend_div=$("<div>").css({"position":"absolute","overflow-x":"hidden"});
	this.container = $("#"+element_id)
				    .css("position","relative")
				    .append(this.legend_div);
	
	this.height=height;
	this.width=width;
	if (this.width || this.height){
		this.container.width(width).height(height);	
	}
	else{
		this.height= this.container.height();
		this.width=this.container.width();
	}
	
	this.metadata={};
	this.grouped_nodes={};
	if (metadata){
		this.addMetadata(metadata);
	}
	this.show_legend=true;
	
			
	this.svg = d3.select("#"+element_id).append('svg')
	 .attr("width",this.width)
	.attr("height",this.height)
	.attr("id","mst-svg");
	
	//legend stuff
	
	this.legend=null;
	this.legend_background;
	this.legend_colours = d3.scale.category20().range().concat(d3.scale.category20b().range(),d3.scale.category20c().range(),["#FFFF00","#1CE6FF","#FF34FF","#FF4A46","#008941","#006FA6","#A30059","#FFDBE5","#7A4900","#0000A6","#63FFAC","#B79762","#004D43","#8FB0FF","#997D87","#5A0007","#809693","#FEFFE6","#1B4400","#4FC601","#3B5DFF","#4A3B53","#FF2F80","#61615A","#BA0900","#6B7900","#00C2A0","#FFAA92","#FF90C9","#B903AA","#D16100","#DDEFFF","#000035","#7B4F4B","#A1C299","#300018","#0AA6D8","#013349","#00846F","#372101","#FFB500","#C2FFED","#A079BF","#CC0744","#C0B9B2","#C2FF99","#001E09","#00489C","#6F0062","#0CBD66","#EEC3FF","#456D75","#B77B68","#7A87A1","#788D66","#885578","#FAD09F","#FF8A9A","#D157A0","#BEC459","#456648","#0086ED","#886F4C","#34362D","#B4A8BD","#00A6AA","#452C2C","#636375","#A3C8C9","#FF913F","#938A81","#575329","#00FECF","#B05B6F","#8CD0FF","#3B9700","#04F757","#C8A1A1","#1E6E00","#7900D7","#A77500","#6367A9","#A05837","#6B002C","#772600","#D790FF","#9B9700","#549E79","#FFF69F","#201625","#72418F","#BC23FF","#99ADC0","#3A2465","#922329","#5B4534","#FDE8DC","#404E55","#0089A3","#CB7E98","#A4E804","#324E72","#6A3A4C","#83AB58","#001C1E","#D1F7CE","#004B28","#C8D0F6","#A3A489","#806C66","#222800","#BF5650","#E83000","#66796D","#DA007C","#FF1A59","#8ADBB4","#1E0200","#5B4E51","#C895C5","#320033","#FF6832","#66E1D3","#CFCDAC","#D0AC94","#7ED379","#012C58","#7A7BFF","#D68E01","#353339","#78AFA1","#FEB2C6","#75797C","#837393","#943A4D","#B5F4FF","#D2DCD5","#9556BD","#6A714A","#001325","#02525F","#0AA3F7","#E98176","#DBD5DD","#5EBCD1","#3D4F44","#7E6405","#02684E","#962B75","#8D8546","#9695C5","#E773CE","#D86A78","#3E89BE","#CA834E","#518A87","#5B113C","#55813B","#E704C4","#00005F","#A97399","#4B8160","#59738A","#FF5DA7","#F7C9BF","#643127","#513A01","#6B94AA","#51A058","#A45B02","#1D1702","#E20027","#E7AB63","#4C6001","#9C6966","#64547B","#97979E","#006A66","#391406","#F4D749","#0045D2","#006C31","#DDB6D0","#7C6571","#9FB2A4","#00D891","#15A08A","#BC65E9","#FFFFFE","#C6DC99","#203B3C","#671190","#6B3A64","#F5E1FF","#FFA0F2","#CCAA35","#374527","#8BB400","#797868","#C6005A","#3B000A","#C86240","#29607C","#402334","#7D5A44","#CCB87C","#B88183","#AA5199","#B5D6C3","#A38469","#9F94F0","#A74571","#B894A6","#71BB8C","#00B433","#789EC9","#6D80BA","#953F00","#5EFF03","#E4FFFC","#1BE177","#BCB1E5","#76912F","#003109","#0060CD","#D20096","#895563","#29201D","#5B3213","#A76F42","#89412E","#1A3A2A","#494B5A","#A88C85","#F4ABAA","#A3F3AB","#00C6C8","#EA8B66","#958A9F","#BDC9D2","#9FA064","#BE4700","#658188","#83A485","#453C23","#47675D","#3A3F00","#061203","#DFFB71","#868E7E","#98D058","#6C8F7D","#D7BFC2","#3C3E6E","#D83D66","#2F5D9B","#6C5E46","#D25B88","#5B656C","#00B57F","#545C46","#866097","#365D25","#252F99","#00CCFF","#674E60","#FC009C","#92896B"]);
	this.default_colour= "#ddd";
	this.category_colours={};
	this.display_category=null;
	this.custom_colours={}
	//date stuff
	this.timeFormat= d3.time.format("%Y-%m-%d");
	this.min_date=null;
	this.max_date=null;
	this.date_scale=null;
	this.calculateDateScale();
	
	//Zooming and translating
	this.scale=1;
	this.translate=[0,0];
	
	var x_zoom_scale=d3.scale.linear().domain([0, this.width]).range([0, this.width]);
	var y_zoom_scale = d3.scale.linear().domain([0, this.height]).range([0, this.height]);
	this.zoom = d3.behavior.zoom()
	     .x(x_zoom_scale)
	     .y(y_zoom_scale);
	
	this.background_rect = this.svg.append('rect')
		.attr("pointer-events","all")
		.style('fill', 'none')
		.attr("width", this.width)
		.attr("height", this.height)
		.call(this.zoom.on('zoom', function(){
			self.canvas.attr('transform', "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
			self.scale=d3.event.scale;
			self.translate=d3.event.translate;
		})
	);
	this.canvas = this.svg.append("g");
	this.canvas.attr("id","vis");
	//resize
	$(window).resize(function(){
		setTimeout(function(){
			self.resize();
		},100);
	});
	
	//keydown
	d3.select('body').on("keydown",function(e){
		self._keyDown(e);
	}).on("keyup",function(e){
		d3.selectAll(".brush").remove();
	});
	
}

D3BaseTree.prototype.parseNewick =  function (a){
	for(var e=[],r={},s=a.split(/\s*(;|\(|\)|,|:)\s*/),t=0;t<s.length;t++){
		var n=s[t];
		switch(n){
			case"(":var c={};r.children=[c],e.push(r),r=c;break;
			case",":var c={};e[e.length-1].children.push(c),r=c;break;
			case")":r=e.pop();break;case":":break;
			default:var h=s[t-1];")"===h||"("===h||","===h?r.name=n:":"===h&&(r.length=parseFloat(n));
		}
	}
	return r;
};



D3BaseTree.prototype.readNexusFile = function (text){
	var nexus=parse_nexus(text);
	var newick = nexus.treesblock.trees[0].newick;
	var root = this.parseNewick(newick);
	return root;

}



/**
* Adds metadat to the tree 
* @param {object} metadata - An object containing id to a list of key value pairs
* If the id does not exist , then an ID property is required which is the ID of node
* If the ID does exist than new properties will be added or existing ones altered
* {55:{name:"bob",colour:"blue",ID:"node_3"},{....},...}
*  To update 
* {55:{colour:"red"}
*/
D3BaseTree.prototype.addMetadata=function(metadata){
	for (var id in metadata){
		var item = metadata[id];
		if (!this.metadata[id]){	
			var node_id = item['ID'];
			var list = this.grouped_nodes[node_id];
			if (! list){
		       		list=[];
				this.grouped_nodes[node_id]=list;
			}
			list.push(id);
			this.metadata[id]=item
		}
		else{
			for (var key in item){
				this.metadata[id][key]=item[key];
			}		
		}	
	}
}
	



D3BaseTree.prototype.resize=function(){
	this.width = this.container.width();
	this.height = this.container.height();
	this.svg.attr('width', this.width).attr('height', this.height);
	var x_scale = d3.scale.linear().domain([0, this.width]).range([0, this.width]);
	var y_scale = d3.scale.linear().domain([0, this.height]).range([0, this.height]);
	var temp_scale=this.zoom.scale();
	var temp_trans=this.zoom.translate();
	this.zoom.x(x_scale).y(y_scale);
	this.zoom.scale(temp_scale);
	this.zoom.translate(temp_trans);
	this.background_rect.attr('height', this.height).attr('width', this.width);
	
	var l_height = $("#legend-svg").height();
	var height = this.height;
	if (l_height<this.height){
		height = l_height+5;
	}
	else{
		height=height-5;
	}
	
	this.legend_div.css({"top":"0px","right":"0px","max-height":height+"px"});
	this.legend_div.height(height);
}

/** Sets the scale (size of the tree)
* @param {float} scale - The scale to set e.g 2
* @param {boolean} relative - If true than the current scale will be multiplied by the scale parameter e.g 0.5,true
* would halve the current size of the tree
*/
D3BaseTree.prototype.setScale=function(scale,relative){
	if (relative){
		scale = this.scale*scale;
	}
	this.zoom.scale(scale);
	this.zoom.event(this.canvas);
};


/** Sets the translate (offset of the tree)
* @param {array} scale - An array containing the x,y offsets eg [30,-100]
*/
D3BaseTree.prototype.setTranslate=function(x_y){
	this.zoom.translate(x_y)
	this.zoom.event(this.canvas);
}


D3BaseTree.prototype._changeCategory=function(category){
	var cust_col = this.custom_colours[category]
	this.display_category = category;
	var items = {};
	var colour_count=0;
	this.category_colours={};
	var len = this.legend_colours.length;
	for (var key in this.metadata){
		var val = this.metadata[key][category];
		if (!val && val !==0){
			continue;
		}
		if (!this.category_colours[val]){
			if (cust_col){
				if (cust_col[val]){
					this.category_colours[val]=cust_col[val];
					colour_count++;
					continue;
				}	
			}
			if (colour_count<len){
				this.category_colours[val]=this.legend_colours[colour_count];
				colour_count++;
			}
			else{
				this.category_colours[val]='black'; 		
			}
		}	
	}
	this.category_colours["missing"] = this.default_colour;
	this.updateLegend(category);
}

D3BaseTree.prototype.getMetadata=function(){
	return this.metadata;
};           


D3BaseTree.prototype.getAllIDs=function(){
	var ids =[];
	for (var id in this.metadata){
		ids.push(id);      
	}      
	return ids;
}


D3BaseTree.prototype.showLegend= function (show){
	this.show_legend=show;
	if (show){
		this.legend_div.show();
	}
	else{
		this.legend_div.hide();
	}

};

D3BaseTree.prototype.updateLegend = function(title){
	var self = this;
	d3.select(this.legend_div[0]).select("svg").remove();
	if (! this.display_category){
		return;
	}
	var legend_data, datum,legend_items;
	if (this.display_category==='Collection Date'){
		legend_data=[{
			group:this.min_date,
			group_colour:'yellow'
			},
			{
			group:this.max_date,
			group_colour:'red'
			}
		];
	}	
	else{
		legend_data=[];
		
		for (var group in this.category_colours) {
			datum = {
				group: group,
				group_colour:this.category_colours[group]
			};
			legend_data.push(datum);
		}
		legend_data.sort(function(a,b){
			if (a.group > b.group){
				return 1;
			}
			if (a.group<b.group){
				return-1;
			}
			return 0;
		});
		
	}
	legend_data.push({
			 group:"missing",
			 group_colour:this.default_colour
	});
	
	
	var legend_svg= d3.select(this.legend_div[0]).append('svg').attr("id","legend-svg");
	var legend = legend_svg.append("g").attr('class', 'legend');
	var legend_items = legend.selectAll('.legend-item').data(legend_data, function(it){
		return it.group;
	});
	legend_items = legend_items.enter().append('g').attr('class', 'legend-item').attr('transform', function(d, i){
		return "translate(0," + ((i + 1) * 20 + 10) + ")";
	});
	/*
	Create rect elements with group colours
	*/
	legend_items.append('rect').attr('x', 0).attr('width', 18).attr('height', 18).style('fill', function(it){
		return it.group_colour;
	}).on("click",function(data){
		var obj={
			category:self.display_category,
			value:data.group,
			colour:data.group_colour
		};
		self.legendItemClicked(obj)
	
	});
	/*
	Create text elements with group names
	*/
	legend_items.append('text').attr('x', 22).attr('y', 9).attr('dy', ".35em").style('text-anchor', 'start').text(function(it){
		var name = it.group;
		if (name.length >25){
			name = name.substring(0,25)+"..."
		}
		return name;
	});
	/*
	Update the legend title
	*/
	legend.selectAll('.legend-title').remove();
	legend.append('text').attr('class', 'legend-title').attr('x', 22).attr('y', 20).attr('font-weight', 'bold').text(title);
	var legend_dim = legend_svg[0][0].getBBox();
	legend_svg.attr('width', 180).attr('height', legend_dim.height + 5);
	this.legend_div.width(180);
	var l_height = $("#legend-svg").height();
	var height = this.height;
	if (l_height<this.height){
		height = l_height+5;
	}
	else{
		height=height-5;
	}
	
	this.legend_div.css({"top":"0px","right":"0px","max-height":height+"px"});
	this.legend_div.height(height);
		
};
	

D3BaseTree.prototype.setColour=function(category,value,colour){
	var cat = this.custom_colours[category];
	if (!cat){
		cat =this.custom_colours[category]={};	
	}
	cat[value]=colour;
};	


D3BaseTree.prototype.calculateDateScale= function(){
		var arr = []
		for (var strain in this.metadata){
			if (!this.metadata[strain]['Collection Date']){
				this.metadata[strain]['Collection Date']='ND';			
			}
			var date  = this.timeFormat.parse(this.metadata[strain]['Collection Date'] )
			arr.push(date);
		}
		var ext = d3.extent(arr);
		var ms_min = Date.parse(ext[0]);
		var ms_max = Date.parse(ext[1]);
		this.min_date = "NA";
		this.max_date='NA'
		if  (ext[0] && ext[1]){
			this.min_date=this.timeFormat(ext[0]);
			this.max_date=this.timeFormat(ext[1]);
			var ms_mid =  ms_min + ((ms_max-ms_min)/2);
			var mid = new Date(ms_mid);
			var st_mid = mid.getFullYear+"-"+(mid.getMonth()+1)+"-"+mid.getDate();
			mid = this.timeFormat.parse(st_mid)
			this.date_scale = d3.time.scale()
			.domain([ext[0],ext[1]])
			.range(["yellow","red"]);
		}
		
};
	
D3BaseTree.prototype._getNodeColour = function(key){
	var strain = this.metadata[key];
	if (!strain){
		return '#ddd'
	}
	var val = strain[this.displayCategory];
	if (!val){
		return '#ddd'
	}
	if (this.displayCategory === 'Collection Date'){
			if (val=== 'ND'){
				return "#ddd"
			}
			return this.date_scale(this.timeFormat.parse(val));
	}
	
	return this.category_colours[val];
};


D3BaseTree.prototype._keyDown= function(e){
	var self = this;
	if (d3.event.shiftKey){
		var brush = this.svg.append("g")
			.datum(function() { 
				return {selected: false, previouslySelected: false}; 
			})
			.attr("class", "brush");      
		var brushX=d3.scale.linear().range([0, this.width]);
		var brushY=d3.scale.linear().range([0, this.height]);
		brush.call(d3.svg.brush()
			.x(this.zoom.x())
			.y(this.zoom.y())
			.on("brushstart",function(){
				self.brushStarted()
			})
			.on("brush", function() {
				var extent = d3.event.target.extent();
				self.brushing(extent);
			})
			.on("brushend", function() {
				var extent = d3.event.target.extent();
				self.brushEnded(extent);
				d3.event.target.clear();
				d3.select(this).call(d3.event.target);

			}));      
	}
	else{
		self.keyPressed(e);
	}
};


D3BaseTree.prototype.downloadSVG=function(name){
	//attach legend to svg
	this.legend_div.show();
	var x = (this.width - 180);
	var leg = $(".legend");
	$("#mst-svg").append(leg);
	leg.attr("transform","translate("+x+",5)");
	var svgData = $("#mst-svg")[0].outerHTML;
	var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
	var svgUrl = URL.createObjectURL(svgBlob);
	var downloadLink = document.createElement("a");
	downloadLink.href = svgUrl;
	downloadLink.download = name;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
	$("#legend-div").append(leg);
	this.showLegend(this.show_legend);
	
};

D3BaseTree.prototype.keyPressed= function(e){};
D3BaseTree.prototype.brushStarted = function(){};
D3BaseTree.prototype.brushing= function(extent){};
D3BaseTree.prototype.brushEnded= function(extent){};
D3BaseTree.prototype.legendItemClicked= function(obj){};

	
				