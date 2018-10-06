import clientRender from './clientRender';
import Home from '../component/Home';

clientRender(Home);

if (module.hot) {
  module.hot.accept(() => {
    console.log('[HMR] module.hot.accept failed');
  })
}