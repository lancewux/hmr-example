import React, { Component } from 'react';
import './hello.scss'

class Hello extends Component {
  constructor(props) {
    super(props);
    this.state = {
      age: ''
    }
    this.onIptChange = this.onIptChange.bind(this);
  }

  onIptChange(e) {
    e.stopPropagation();
    const age = e.target.value || '';
    this.setState({
      age
    })
  }

  render() {
    const { age } = this.state;
    return (
      <div className="hello">
        <span className="desc">hello age:</span>
        <input className="ipt" value={age} onChange={this.onIptChange} type="text" />
      </div>
    );
  }
}

export default Hello;