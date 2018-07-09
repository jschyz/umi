import routesToJSON from './routesToJSON';

const service = {
  config: {},
  paths: {
    cwd: '$CWD$',
    absSrcPath: '$SRC$',
    tmpDirPath: './pages/.umi',
    absCompilingComponentPath: '$COMPILING$',
  },
};

process.env.COMPILE_ON_DEMAND = true;

describe('routesToJSON', () => {
  it('normal', () => {
    const json = routesToJSON([{ component: './pages/A' }], service, {});
    expect(JSON.parse(json)).toEqual([
      { component: "require('../A').default" },
    ]);
  });

  it('relative component path', () => {
    const json = routesToJSON(
      [
        { component: './pages/A' },
        { component: './pages/A/A' },
        { component: './A' },
        { component: './B/A' },
      ],
      service,
      {},
    );
    expect(JSON.parse(json)).toEqual([
      { component: "require('../A').default" },
      { component: "require('../A/A').default" },
      { component: "require('../../A').default" },
      { component: "require('../../B/A').default" },
    ]);
  });

  it('dynamic load when env is production and react.dynamicImport is true', () => {
    const json = routesToJSON(
      [{ component: './pages/A' }],
      {
        ...service,
        config: { react: { dynamicImport: true } },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), {})",
      },
    ]);
  });

  it('dynamic load when env is production (dynamicLevel = 1)', () => {
    const json = routesToJSON(
      [
        { component: './pages/A' },
        {
          path: '/B',
          component: './pages/B',
          routes: [{ component: './pages/B/B' }, { component: './pages/B/C' }],
        },
      ],
      {
        ...service,
        config: { react: { dynamicImport: true } },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), {})",
      },
      {
        path: '/B',
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__B^ */'../B'), {})",
        routes: [
          {
            component:
              "dynamic(() => import(/* webpackChunkName: ^pages__B^ */'../B/B'), {})",
          },
          {
            component:
              "dynamic(() => import(/* webpackChunkName: ^pages__B^ */'../B/C'), {})",
          },
        ],
      },
    ]);
  });

  it('dynamic load when env is production (dynamicLevel = 2)', () => {
    const json = routesToJSON(
      [
        { component: './pages/A' },
        {
          path: '/',
          component: './pages/B',
          routes: [{ component: './pages/B/B' }, { component: './pages/B/C' }],
        },
      ],
      {
        ...service,
        config: { react: { dynamicImport: true } },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), {})",
      },
      {
        path: '/',
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__B^ */'../B'), {})",
        routes: [
          {
            component:
              "dynamic(() => import(/* webpackChunkName: ^pages__B__B^ */'../B/B'), {})",
          },
          {
            component:
              "dynamic(() => import(/* webpackChunkName: ^pages__B__C^ */'../B/C'), {})",
          },
        ],
      },
    ]);
  });

  it('dynamic load when env is production (with loading)', () => {
    const json = routesToJSON(
      [{ component: './pages/A' }],
      {
        ...service,
        config: {
          react: {
            dynamicImport: true,
            loadingComponent: './LoadingComponent',
          },
        },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), { loading: require('$SRC$/LoadingComponent').default })",
      },
    ]);
  });

  it('dynamic load when env is production (with loading) (winPath)', () => {
    const json = routesToJSON(
      [{ component: './pages/A' }],
      {
        ...service,
        config: {
          react: {
            dynamicImport: true,
            loadingComponent: 'AAA\\LoadingComponent',
          },
        },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), { loading: require('$SRC$/AAA/LoadingComponent').default })",
      },
    ]);
  });

  it('disable dynamicImport by default', () => {
    const json = routesToJSON(
      [{ component: './pages/A' }],
      service,
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      { component: "require('../A').default" },
    ]);
  });

  it('component with react function', () => {
    const json = routesToJSON(
      [{ component: '() => A', path: '/a' }],
      service,
      {},
    );
    expect(JSON.parse(json)).toEqual([{ component: '() => A', path: '/a' }]);
  });

  it('path with htmlSuffix', () => {
    const json = routesToJSON(
      [
        { component: './pages/A', path: '/a(.html)?' },
        { component: './pages/B', path: '/b' },
      ],
      {
        ...service,
        config: { exportStatic: { htmlSuffix: true } },
      },
    );
    expect(JSON.parse(json)).toEqual([
      {
        component: "require('../A').default",
        path: '/a(.html)?',
      },
      {
        component: "require('../B').default",
        path: '/b',
      },
    ]);
  });

  it('applyPlugins', () => {
    let applyPluginName = null;
    let applyPluginOpts = null;
    let applied = false;
    const json = routesToJSON(
      [{ path: '/', component: './pages/A' }],
      {
        ...service,
        config: { react: { dynamicImport: true } },
        applyPlugins(name, opts) {
          applyPluginName = name;
          applyPluginOpts = opts;
          applied = true;
          return `${opts.initialValue}__Modified`;
        },
      },
      'production',
    );
    expect(JSON.parse(json)).toEqual([
      {
        path: '/',
        component:
          "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), {})__Modified",
      },
    ]);
    expect(applied).toEqual(true);
    expect(applyPluginName).toEqual('modifyRouteComponent');
    expect(applyPluginOpts).toEqual({
      initialValue:
        "dynamic(() => import(/* webpackChunkName: ^pages__A^ */'../A'), {})",
      args: {
        pageJSFile: '../A',
        importPath: '../A',
        webpackChunkName: 'pages__A',
        config: { react: { dynamicImport: true } },
      },
    });
  });

  it('Route', () => {
    const json = routesToJSON([{ Route: './routes/A' }], service, {});
    expect(JSON.parse(json)).toEqual([
      { Route: "require('$CWD$/routes/A').default" },
    ]);
  });

  it('Route with winPath', () => {
    const json = routesToJSON([{ Route: 'routes\\A' }], service, {});
    expect(JSON.parse(json)).toEqual([
      { Route: "require('$CWD$/routes/A').default" },
    ]);
  });
});
