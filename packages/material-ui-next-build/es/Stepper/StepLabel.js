var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '../styles/withStyles';
import Typography from '../Typography';
import StepIcon from './StepIcon';

export const styles = theme => ({
  root: {
    display: 'flex',
    alignItems: 'center'
  },
  horizontal: {},
  vertical: {},
  alternativeLabel: {
    flexDirection: 'column'
  },
  disabled: {
    cursor: 'default'
  },
  label: {
    color: theme.palette.text.secondary
  },
  labelActive: {
    color: theme.palette.text.primary,
    fontWeight: 500
  },
  labelCompleted: {
    color: theme.palette.text.primary,
    fontWeight: 500
  },
  labelAlternativeLabel: {
    textAlign: 'center',
    marginTop: theme.spacing.unit * 2
  },
  iconContainer: {},
  iconContainerNoAlternative: {
    paddingRight: theme.spacing.unit
  },
  labelContainer: {
    width: '100%'
  }
});

function StepLabel(props) {
  const {
    active,
    alternativeLabel,
    children,
    classes,
    className: classNameProp,
    completed,
    disabled,
    icon,
    last,
    optional,
    orientation
  } = props,
        other = _objectWithoutProperties(props, ['active', 'alternativeLabel', 'children', 'classes', 'className', 'completed', 'disabled', 'icon', 'last', 'optional', 'orientation']);

  return React.createElement(
    'span',
    _extends({
      className: classNames(classes.root, classes[orientation], {
        [classes.disabled]: disabled,
        [classes.alternativeLabel]: alternativeLabel
      }, classNameProp)
    }, other),
    icon && React.createElement(
      'span',
      {
        className: classNames(classes.iconContainer, {
          [classes.iconContainerNoAlternative]: !alternativeLabel
        })
      },
      React.createElement(StepIcon, {
        completed: completed,
        active: active,
        icon: icon,
        alternativeLabel: alternativeLabel
      })
    ),
    React.createElement(
      'span',
      { className: classes.labelContainer },
      React.createElement(
        Typography,
        {
          variant: 'body1',
          component: 'span',
          className: classNames(classes.label, {
            [classes.labelAlternativeLabel]: alternativeLabel,
            [classes.labelCompleted]: completed,
            [classes.labelActive]: active
          })
        },
        children
      ),
      optional
    )
  );
}

StepLabel.propTypes = {
  /**
   * @ignore
   * Sets the step as active. Is passed to child components.
   */
  active: PropTypes.bool,
  /**
   * @ignore
   * Set internally by Stepper when it's supplied with the alternativeLabel property.
   */
  alternativeLabel: PropTypes.bool,
  /**
   * In most cases will simply be a string containing a title for the label.
   */
  children: PropTypes.node,
  /**
   * Custom styles for component.
   */
  classes: PropTypes.object.isRequired,
  /**
   * @ignore
   */
  className: PropTypes.string,
  /**
   * @ignore
   * Mark the step as completed. Is passed to child components.
   */
  completed: PropTypes.bool,
  /**
   * Mark the step as disabled, will also disable the button if
   * `StepLabelButton` is a child of `StepLabel`. Is passed to child components.
   */
  disabled: PropTypes.bool,
  /**
   * Override the default icon.
   */
  icon: PropTypes.node,
  /**
   * @ignore
   */
  last: PropTypes.bool,
  /**
   * The optional node to display.
   */
  optional: PropTypes.node,
  /**
   * @ignore
   */
  orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};

StepLabel.defaultProps = {
  active: false,
  alternativeLabel: false,
  completed: false,
  disabled: false,
  last: false,
  orientation: 'horizontal'
};

StepLabel.muiName = 'StepLabel';

export default withStyles(styles, { name: 'MuiStepLabel' })(StepLabel);