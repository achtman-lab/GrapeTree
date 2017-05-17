#include <vector>
#include <algorithm>
#include <iostream>
#include <string>
#include <iterator>
#include <boost/property_map/property_map.hpp>
#include <boost/graph/adjacency_list.hpp>
#include <boost/algorithm/string.hpp>

#include "edmonds_optimum_branching.hpp"

// Define a directed graph type that associates a weight with each
// edge. We store the weights using internal properties as described
// in BGL.
typedef boost::property<boost::edge_weight_t, double>       EdgeProperty;
typedef boost::adjacency_list<boost::listS,
                              boost::vecS,
                              boost::directedS,
                              boost::no_property,
                              EdgeProperty>                 Graph;
typedef boost::graph_traits<Graph>::vertex_descriptor       Vertex;
typedef boost::graph_traits<Graph>::edge_descriptor         Edge;


int edmonds(std::vector< std::vector<float> >  arr1) {
    // Graph with N vertices    
	int N = arr1.size();
    Graph G(N);

    // Create a vector to keep track of all the vertices and enable us to index them.
    std::vector<Vertex> the_vertices;
    BOOST_FOREACH (Vertex v, vertices(G))
    {
        the_vertices.push_back(v);
    }
    
    // add a few edges with weights to the graph
	int m=0, n=0;
	for (m=0; m < N; ++ m) {
		for (n=0; n < N; ++ n) {
			float v = arr1[m][n];
			if ( v > 0 ) {
			    add_edge(the_vertices[m], the_vertices[n], v, G);
			}
		}
	}

    // This is how we can get a property map that gives the weights of
    // the edges.
    boost::property_map<Graph, boost::edge_weight_t>::type weights =
        get(boost::edge_weight_t(), G);
    
    // This is how we can get a property map mapping the vertices to
    // integer indices.
    boost::property_map<Graph, boost::vertex_index_t>::type vertex_indices =
        get(boost::vertex_index_t(), G);

    // Find the maximum branching.
    std::vector<Edge> branching;
    edmonds_optimum_branching<false, true, false>(G,
                                                  vertex_indices,
                                                  weights,
                                                  static_cast<Vertex *>(0),
                                                  static_cast<Vertex *>(0),
                                                  std::back_inserter(branching));
    
	// return the array as a numpy array (numpy will free it later)
    BOOST_FOREACH (Edge e, branching) {
		std::cout << boost::source(e, G) << "\t" << boost::target(e, G) << "\t" << get(weights, e) << std::endl;
    }
	return 0;
}


int main() {
	std::string line;
	std::getline(std::cin, line);
	
	std::vector<std::string> strs;
	boost::split(strs, line, boost::is_any_of("\t "));
	
	std::vector< std::vector<float> > dist(strs.size(), std::vector<float>(strs.size()));
	for (int i=0; i < strs.size(); ++i) {
		dist[0][i] = std::atof(strs[i].c_str());
	}
	int n = 1;
	for (std::string line; std::getline(std::cin, line);++ n) {
		boost::split(strs, line, boost::is_any_of("\t "));
		for (int i=0; i < strs.size(); ++i) {
			dist[n][i] = std::atof(strs[i].c_str());
		}
		if (n >= strs.size()-1) break;
	}
	return edmonds(dist);
}
