import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import AppActions from '../../actions/app-actions';
import { AppContext } from '../../contexts/app-context';
import { preformatWithRequestID } from '../../helpers';
import AppStore from '../../stores/app-store';
import { setRetryTimer, clearRetryTimer, clearAllRetryTimers } from '../../utils/retrytimer';
import Repository from './repository';

export default class Artifacts extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = this._getState();
  }
  componentWillMount() {
    AppStore.changeListener(this._onChange.bind(this));
  }
  componentDidMount() {
    clearAllRetryTimers();
    this.artifactTimer = setInterval(() => this._getArtifacts(), this.state.refreshArtifactsLength);
    this._getArtifacts();
  }
  componentWillUnmount() {
    clearAllRetryTimers();
    clearInterval(this.artifactTimer);
    AppStore.removeChangeListener(this._onChange.bind(this));
  }
  componentDidUpdate(prevProps) {
    if (prevProps.artifactProgress && !this.props.artifactProgress) {
      clearInterval(this.artifactTimer);
      this.artifactTimer = setInterval(() => this._getArtifacts(), this.state.refreshArtifactsLength);
      this._getArtifacts();
    }
  }
  _getState() {
    return {
      artifacts: AppStore.getArtifactsRepo(),
      selected: null,
      remove: false,
      refreshArtifactsLength: 60000,
      showHelptips: AppStore.showHelptips()
    };
  }
  _onChange() {
    this.setState(this._getState());
    if (this.props.params) {
      if (this.props.params.artifactVersion) {
        // selected artifacts
        var artifact = AppStore.getSoftwareArtifact('name', this.props.params.artifactVersion);
        this.setState({ selected: artifact });
      }
    }
  }
  _startLoading(bool) {
    this.setState({ doneLoading: !bool });
  }
  _getArtifacts() {
    var self = this;
    return AppActions.getArtifacts()
      .then(artifacts => {
        clearRetryTimer('artifacts');
        setTimeout(() => {
          self.setState({ doneLoading: true, artifacts });
        }, 300);
      })
      .catch(err => {
        var errormsg = err.error || 'Please check your connection';
        setRetryTimer(err, 'artifacts', `Artifacts couldn't be loaded. ${errormsg}`, self.state.refreshArtifactsLength);
      });
  }
  _removeDialog(artifact) {
    AppActions.setSnackbar('');
    if (artifact) {
      this.setState({ remove: true, artifact });
    } else {
      this.setState({ remove: false, artifact: null });
    }
  }
  _removeArtifact() {
    var self = this;
    return AppActions.removeArtifact(self.state.artifact.id)
      .then(() => {
        AppActions.setSnackbar('Artifact was removed', 5000, '');
        self._getArtifacts();
      })
      .catch(err => {
        var errMsg = err.res.body.error || '';
        AppActions.setSnackbar(preformatWithRequestID(err.res, `Error removing artifact: ${errMsg}`), null, 'Copy to clipboard');
      });
  }
  render() {
    return (
      <div>
        <AppContext.Consumer>
          {({ uploadArtifact }) => (
            <Repository
              uploadArtifact={uploadArtifact}
              progress={this.props.artifactProgress}
              showHelptips={this.state.showHelptips}
              removeArtifact={artifact => this._removeDialog(artifact)}
              refreshArtifacts={this._getArtifacts}
              startLoader={this._startLoading}
              loading={!this.state.doneLoading}
              selected={this.state.selected}
              artifacts={this.state.artifacts}
            />
          )}
        </AppContext.Consumer>

        <Dialog open={this.state.remove}>
          <DialogTitle>Remove this artifact?</DialogTitle>
          <DialogContent>
            Are you sure you want to remove <i>{(this.state.artifact || {}).name}</i>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this._removeDialog(null)}>Cancel</Button>

            <Button variant="contained" color="secondary" onClick={() => this._removeArtifact()}>
              Remove artifact
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
