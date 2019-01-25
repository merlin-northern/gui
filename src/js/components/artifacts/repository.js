import React from 'react';
import PropTypes from 'prop-types';
import Time from 'react-time';
import AppActions from '../../actions/app-actions';
import ReactDOM from 'react-dom';
import ReactTooltip from 'react-tooltip';
import { UploadArtifact, ExpandArtifact } from '../helptips/helptooltips';
import Loader from '../common/loader';
import SearchInput from 'react-search-input';
import SelectedArtifact from './selectedartifact';
import { Collapse } from 'react-collapse';
import Dropzone from 'react-dropzone';

// material ui
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn } from 'material-ui/Table';
import FontIcon from 'material-ui/FontIcon';
import FileIcon from 'react-material-icons/icons/file/file-upload';
import IconButton from 'material-ui/IconButton';
import LinearProgress from 'material-ui/LinearProgress';
import { preformatWithRequestID } from '../../helpers';

var artifacts = [];

export default class Repository extends React.Component {
  static contextTypes = {
    router: PropTypes.object
  };
  constructor(props, context) {
    super(props, context);
    this.state = {
      artifact: {
        name: null,
        description: null,
        device_types: null
      },
      sortCol: 'name',
      sortDown: true,
      searchTerm: null,
      upload: false,
      popupLabel: 'Upload a new artifact',
      artifacts: [],
      tmpFile: null,
      divHeight: 178
    };
  }

  componentWillReceiveProps(nextProps) {
    artifacts = nextProps.artifacts;
    if (nextProps.selected) {
      this.setState({ artifact: nextProps.selected });
    }
  }

  _resetArtifactState() {
    var artifact = {
      name: null,
      description: null,
      device_types: null
    };
    this.setState({ artifact: artifact });
  }
  onDrop(acceptedFiles, rejectedFiles) {
    if (acceptedFiles.length) {
      this._onUploadSubmit(acceptedFiles);
    }
    if (rejectedFiles.length) {
      AppActions.setSnackbar(`File '${rejectedFiles[0].name}' was rejected. File must be of type .mender`, null);
    }
  }
  _onUploadSubmit(files) {
    var self = this;
    //var tmpFile = meta.artifactFile;
    //delete meta.artifactFile;
    //delete meta.verified;
    var meta = { description: '' };
    files.forEach(file => {
      self.props.uploadArtifact(meta, file);
    });

    this._resetArtifactState();
  }
  _editArtifactData(id, description) {
    var self = this;
    var body = {
      description: description
    };
    return AppActions.editArtifact(id, body)
      .then(() => {
        AppActions.setSnackbar('Artifact details were updated successfully.', 5000, '');
        var updated = self.state.artifact;
        updated.description = description;
        self.setState({ artifact: updated });
        self.props.refreshArtifacts();
      })
      .catch(err => {
        var errMsg = err.res.body.error || '';
        AppActions.setSnackbar(preformatWithRequestID(errMsg, `Artifact details couldn't be updated. ${err.error}`), null, 'Copy to clipboard');
      });
  }

  _onRowSelection(rowNumber, columnId) {
    var artifact = artifacts[rowNumber];
    if (columnId <= 3) {
      if (this.state.artifact === artifact) {
        this._resetArtifactState();
      } else {
        this.setState({ artifact: artifact });
      }
    }
  }
  _sortColumn(col) {
    var direction;
    if (this.state.sortCol !== col) {
      ReactDOM.findDOMNode(this.refs[this.state.sortCol]).className = 'sortIcon material-icons';
      ReactDOM.findDOMNode(this.refs[col]).className = 'sortIcon material-icons expand';
      this.setState({ sortCol: col, sortDown: true });
      direction = true;
    } else {
      direction = !this.state.sortDown;
      ReactDOM.findDOMNode(this.refs[this.state.sortCol]).className = `sortIcon material-icons expand ${direction}`;
      this.setState({ sortDown: direction });
    }
    // sort table
    AppActions.sortTable('_artifactsRepo', col, direction);
  }
  searchUpdated(term) {
    this.setState({ searchTerm: term, artifact: {} }); // needed to force re-render
  }
  _onClick(event) {
    event.stopPropagation();
  }
  _formatTime(date) {
    if (date) {
      return date
        .replace(' ', 'T')
        .replace(/ /g, '')
        .replace('UTC', '');
    }
    return;
  }
  _adjustCellHeight(height) {
    this.setState({ divHeight: height + 110 });
  }
  _handleRemove() {
    // pass artifact to be removed up to parent to trigger dialog
    this.props.removeArtifact(this.state.artifact);
  }
  render() {
    const self = this;
    var styles = {
      buttonIcon: {
        height: '100%',
        display: 'inline-block',
        verticalAlign: 'middle',
        float: 'left',
        paddingLeft: '12px',
        lineHeight: '36px',
        marginRight: '-6px',
        color: '#ffffff',
        fontSize: '16px'
      },
      flatButtonIcon: {
        height: '100%',
        display: 'inline-block',
        verticalAlign: 'middle',
        float: 'left',
        paddingLeft: '12px',
        lineHeight: '36px',
        marginRight: '-6px',
        color: 'rgba(0,0,0,0.8)',
        fontSize: '16px'
      },
      sortIcon: {
        verticalAlign: 'middle',
        marginLeft: '10px',
        color: '#8c8c8d',
        cursor: 'pointer'
      }
    };

    var tmpArtifacts = [];
    if (this.refs.search) {
      var filters = ['name', 'device_types_compatible', 'description'];
      tmpArtifacts = artifacts.filter(this.refs.search.filter(filters));
    }

    var items = tmpArtifacts.map(function(pkg, index) {
      var compatible = pkg.device_types_compatible.join(', ');
      var expanded = '';
      if (this.state.artifact.id === pkg.id) {
        expanded = (
          <SelectedArtifact
            removeArtifact={() => this._handleRemove()}
            compatible={compatible}
            formatTime={this._formatTime}
            editArtifact={this._editArtifactData}
            buttonStyle={styles.flatButtonIcon}
            artifact={this.state.artifact}
          />
        );
      }

      return (
        <TableRow hoverable={!expanded} className={expanded ? 'expand' : null} key={index}>
          <TableRowColumn style={expanded ? { height: this.state.divHeight } : null}>{pkg.name}</TableRowColumn>
          <TableRowColumn>{compatible}</TableRowColumn>
          <TableRowColumn>
            <Time value={this._formatTime(pkg.modified)} format="YYYY-MM-DD HH:mm" />
          </TableRowColumn>
          <TableRowColumn style={{ width: '55px', paddingRight: '0', paddingLeft: '12px' }} className="expandButton">
            <IconButton className="float-right">
              <FontIcon className="material-icons">{expanded ? 'arrow_drop_up' : 'arrow_drop_down'}</FontIcon>
            </IconButton>
          </TableRowColumn>
          <TableRowColumn style={{ width: '0', padding: '0', overflow: 'visible' }}>
            <Collapse
              springConfig={{ stiffness: 210, damping: 20 }}
              onMeasure={measurements => self._adjustCellHeight(measurements.height)}
              className="expanded"
              isOpened={expanded ? true : false}
            >
              {expanded}
            </Collapse>
          </TableRowColumn>
        </TableRow>
      );
    }, this);

    return (
      <div>
        <div className={items.length ? 'top-right-button fadeIn' : 'top-right-button fadeOut'}>
          <Dropzone
            disabled={this.props.progress > 0}
            activeClassName="active"
            rejectClassName="active"
            multiple={false}
            accept=".mender"
            onDrop={(accepted, rejected) => this.onDrop(accepted, rejected)}
          >
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()} className="dropzone onboard dashboard-placeholder">
                <input {...getInputProps()} />
                <div className="icon inline-block">
                  <FileIcon style={{ height: '24px', width: '24px', verticalAlign: 'middle', marginTop: '-2px' }} />
                </div>
                <div className="dashboard-placeholder inline">
                  Drag here or <a>browse</a> to upload an artifact file
                </div>
              </div>
            )}
          </Dropzone>
        </div>

        <div>
          <h3 className="inline-block">Available artifacts</h3>
          <SearchInput placeholder="Search artifacts" className="search tableSearch" ref="search" onChange={term => this.searchUpdated(term)} />
        </div>

        <div id="progressBarContainer" className={this.props.progress ? null : 'shrunk'}>
          <p className="align-center">Upload in progress ({Math.round(this.props.progress)}%)</p>
          <LinearProgress mode="determinate" style={{ backgroundColor: '#c7c7c7', margin: '15px 0' }} value={this.props.progress} />
        </div>

        <Loader show={this.props.loading} />

        <div style={{ position: 'relative', marginTop: '10px' }}>
          <Table onCellClick={(row, col) => this._onRowSelection(row, col)} className={items.length ? null : 'hidden'}>
            <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
              <TableRow>
                <TableHeaderColumn className="columnHeader" tooltip="Name">
                  Name{' '}
                  <FontIcon ref="name" style={styles.sortIcon} onClick={() => this._sortColumn('name')} className="sortIcon material-icons">
                    sort
                  </FontIcon>
                </TableHeaderColumn>
                <TableHeaderColumn className="columnHeader" tooltip="Device type compatibility">
                  Device type compatibility{' '}
                  <FontIcon ref="device_types" style={styles.sortIcon} onClick={() => this._sortColumn('device_types')} className="sortIcon material-icons">
                    sort
                  </FontIcon>
                </TableHeaderColumn>
                <TableHeaderColumn className="columnHeader" tooltip="Last modified">
                  Last modified{' '}
                  <FontIcon style={styles.sortIcon} ref="modified" onClick={() => this._sortColumn('modified')} className="sortIcon material-icons">
                    sort
                  </FontIcon>
                </TableHeaderColumn>
                <TableHeaderColumn style={{ width: '55px', paddingRight: '12px', paddingLeft: '0' }} className="columnHeader" />
              </TableRow>
            </TableHeader>
            <TableBody displayRowCheckbox={false} showRowHover={true} className="clickable">
              {items}
            </TableBody>
          </Table>

          {this.props.showHelptips && items.length ? (
            <div>
              <div id="onboard-10" className="tooltip help" data-tip data-for="artifact-expand-tip" data-event="click focus">
                <FontIcon className="material-icons">help</FontIcon>
              </div>
              <ReactTooltip id="artifact-expand-tip" globalEventOff="click" place="bottom" type="light" effect="solid" className="react-tooltip">
                <ExpandArtifact />
              </ReactTooltip>
            </div>
          ) : null}

          <div className={items.length || this.props.loading || this.props.progress ? 'hidden' : 'dashboard-placeholder fadeIn'}>
            <Dropzone
              disabled={this.props.progress > 0}
              activeClassName="active"
              rejectClassName="active"
              multiple={false}
              accept=".mender"
              onDrop={(accepted, rejected) => this.onDrop(accepted, rejected)}
            >
              {({ getRootProps, getInputProps }) => (
                <div {...getRootProps()} className="dropzone onboard dashboard-placeholder">
                  <input {...getInputProps()} />
                  <p style={{ width: '500px', fontSize: '16px', margin: 'auto' }}>
                    No artifacts found. Drag a file here or <a>browse</a> to upload to the repository
                  </p>
                  <img src="assets/img/artifacts.png" alt="artifacts" />
                </div>
              )}
            </Dropzone>
            {this.props.showHelptips ? (
              <div>
                <div id="onboard-9" className="tooltip help highlight" data-tip data-for="artifact-upload-tip" data-event="click focus">
                  <FontIcon className="material-icons">help</FontIcon>
                </div>
                <ReactTooltip id="artifact-upload-tip" globalEventOff="click" place="bottom" type="light" effect="solid" className="react-tooltip">
                  <UploadArtifact />
                </ReactTooltip>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
