#ifndef EDMONDS_OPTIMUM_BRANCHING_HPP
#define EDMONDS_OPTIMUM_BRANCHING_HPP

// edmonds_optimum_branching()
//
// This template function implements Tarjan's implementation of
// Edmonds's algorithm for finding optimum branchings. The function
// uses concepts from the Boost graph library. The template parameters
// have the following definition:
//
// TOptimumIsMaximum: if true then the algorithm finds a branching of
// maximum weight. If false, the algorithm finds a branching with
// minimum weight.
//
// TAttemptToSpan: if true, the algorithm attempts to span the entire
// graph. If root vertices have been assigned by the caller (see
// description of roots_begin and roots_end) and at least one
// branching exists whose only roots are those specified, then the
// algorithm finds an optimum branching whose roots are exactly those
// specified. If no roots have been specified by the caller and at
// least one branching exists with exactly one root, then the
// algorithm finds an optimum branching with exactly one root.  If the
// parameter is false, an optimum branching is returned that may not
// span the entire graph. For example, no edge that worsens the cost
// of the branching is included.
//
// TGraphIsDense: if true, the algorithm will have time complexity
// O(n^2) where n is the number of vertices of the graph. If false,
// the algorithm will have time complexity O(m log n) where n is the
// number of vertices and m is the number of edges of the
// graph. NOTE!!! currently, this parameter has no effect as the
// function is only implemented for dense graphs.
//
// TEdgeListGraph: the type of the graph that adheres to the
// EdgeListGraph concept of the Boost Graph Library.
//
// TVertexIndexMap: the type of the Boost property map that maps the
// vertices of the graph to non-negative integers.
//
// TWeightMap: the type of the Boost property map that associates
// weights with each edge of the graph. Note that the weights must be
// of a numeric type that supports the operations of +, -, <, >.
//
// TInputIterator: the type of iterator used for traversing
// vertices. The type must adhere to the Input Iterator concept of the STL.
//
// TOutputIterator: the type of iterator used for outputting the edges
// of the branching. The type must adhere to the Output Iterator
// concept of the STL.
//
// The input to the graph is as follows:
//
// g is the graph that adheres to the EdgeListGraph concept of the
// Boost Graph Library.
//
// index is a Boost property map that maps each vertex of g to a
// positive integer. If g contains n vertices, then index must map
// each vertex uniquely to an integer in the range 0..n-1. Constant
// time complexity is required.
//
// weight is a Boost property map associating a weight with each edge
// of g. Constant time complexity is required.
//
// roots_begin and roots_end are iterators over vertices of g. Any
// vertices in this range are guaranteed to be roots in the final
// branching. This range may of course be empty, in which case
// appropriate roots are found by the algorithm.
//
// out is an output iterator to which the edges of the optimum
// branching is written.
// 
template <bool TOptimumIsMaximum,
          bool TAttemptToSpan,
          bool TGraphIsDense,
          class TEdgeListGraph,
          class TVertexIndexMap,
          class TWeightMap,
          class TInputIterator,
          class TOutputIterator>
void
edmonds_optimum_branching(TEdgeListGraph &g,
                          TVertexIndexMap index,
                          TWeightMap weight,
                          TInputIterator roots_begin,
                          TInputIterator roots_end,
                          TOutputIterator out);


#include "edmonds_optimum_branching_impl.hpp"


#endif // not EDMONDS_OPTIMUM_BRANCHING_HPP
