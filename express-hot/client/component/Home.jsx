import React, { Component } from 'react';
import Hello from './Hello';
import './home.scss';
import { hot } from 'react-hot-loader';

class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: ''
    }
    this.onIptChange = this.onIptChange.bind(this);
  }

  onIptChange(e){
    e.stopPropagation();
    const name = e.target.value || '';
    this.setState({
      name
    })
  }

  componentDidMount() {
    console.log(window && window.__DATA__);
  }

  render() {
    const { name } = this.state;
    return (
      <div className="home">
        <div className="row">
          <span className="desc">home name:</span>
          <input className="ipt" value={name} onChange={this.onIptChange} type="text"/>
        </div>
        <Hello/>
      </div>
    );
  }
}

if (module.hot) {
  Home = hot(module)(Home);
}

export default Home;