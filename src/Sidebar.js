import React, { Component } from 'react'

class Sidebar extends Component {
  componentDidMount() {
    this.props.setSidebarCanvas(this.side_canvas)
    this.handleSelectAlgorithm = this.handleSelectAlgorithm.bind(this)
  }

  handleSelectAlgorithm(e) {
    let v = e.target.value
    this.props.selectAlgorithm(v)
  }
  formatComment(comment) {
    // Split the comment string into parts
    var parts = comment.split(' ');

    // Extract author and date
    var author = parts[0].substring(0, parts[0].length-1);
    var date = parts[1].substring(0, 10); // Extract first 10 characters for date
    var firstWord = parts[1].substring(10, parts[1].length);
    // Join the remaining parts to form the comment text
    var commentText = firstWord+ " "+parts.slice(2).join(' ');

    // Format the output string
    var formattedString = [author , date , commentText];

    return formattedString;
}

  render() {
    let {
      sidebar_orientation,
      sidebar_image_size,
      grem,
      p,
      hover_index,
      mnist_labels,
      comments,
      color_array,
      algorithm_options,
      algorithm_choice,
    } = this.props
    
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexGrow: 1,
        }}
      >
        <div>
          {' '}
      
          <div
            style={{
              display: 'flex',
              flexDirection:
                sidebar_orientation === 'horizontal' ? 'row' : 'column',
            }}
          >
            <div>
              <canvas
                ref={side_canvas => {
                  this.side_canvas = side_canvas
                }}
                width={sidebar_image_size}
                height={sidebar_image_size*0.75}
              />
            </div>
            <div style={{ flexGrow: 1 }}>
              <div
                style={{
                  background: hover_index
                    ? `rgb(${color_array[mnist_labels[hover_index]  % color_array.length].join(',')})`
                    : 'transparent',
                  color: hover_index ? '#000' : '#999',
                  padding: p(grem / 4, grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                  transition: 'all 0.1s linear',
                }}
              >
                <div>Label:</div>
                {hover_index ? <div>{mnist_labels[hover_index]}</div> : null}
              </div>

              <div
                style={{
                  padding: p(grem / 4, grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#999'
                }}
              >
                Shader ID:
                {hover_index&&comments[hover_index] ? <div>{comments[hover_index][1]}</div> : null}
              </div>

              <div
                style={{
                  padding: p(grem / 4, grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#999'
                }}
              >
                
                {/* Index:
                {hover_index ? <div>{hover_index}</div> : null}
                
              </div>
              <div
                style={{
                  padding: p(grem / 4, grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              > */}

              
                Author:
                {hover_index && comments[hover_index] ? <div>{this.formatComment(comments[hover_index][0])[0]}</div> : null}
                
              </div>
              <div
                style={{
                  padding: p(grem / 4, grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#999'
                }}
              >
                Date:
                {hover_index && comments[hover_index] ? <div>{this.formatComment(comments[hover_index][0])[1]}</div> : null}
                
              </div>
              <div
                style={{
                  padding: p(grem / 4 , grem / 2),
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginRight: '10'
                }}
              >
                
                {hover_index && comments[hover_index] ? <div>{this.formatComment(comments[hover_index][0])[2]}</div> : null}
                
              </div>



            </div>
          </div>
        </div>
      
        <div style={{ padding: grem / 2 }}>
          <div>
          <div
            style={{
              padding: grem / 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>Structure:</div>
            <select
              onChange={this.handleSelectAlgorithm}
              value={algorithm_options[algorithm_choice]}
            >
              {algorithm_options.map((option, index) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          
          Toggle Labels:_  
<label class="switch" >

  <input type="checkbox" onChange={(e) => {
                let t = e.target.checked
                this.props.setLabelToggle(t)
              }}>
    
  </input>
  <span class="slider round"></span>
  
</label>
           
            <button
              onClick={() => {
                this.props.toggleAbout(true)
              }}
              style={{
                //align right
                textAlign: 'right',
                width: '100%',
              }}
            >
                  About
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default Sidebar
